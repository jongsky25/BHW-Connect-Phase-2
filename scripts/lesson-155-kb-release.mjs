// Publish only the two reviewed self-management answers; never stage other KB rows.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadTrainingCourse} from './lib/training-content.mjs';
import {renderAnswer,reviewDueOn} from './lib/kb-content.mjs';
import {createClient,signIn,requireEnv,projectUrl} from './lib/supabase-rest.mjs';

const apply=process.argv.includes('--apply');
assert.equal(process.argv.length,3);
assert.ok(apply||process.argv.includes('--dry-run'));
const ids=['d1m5-self-management-skills','d1m5-self-management-improve'];
const course=loadTrainingCourse('day1-basic-competencies');
const entries=ids.map(id=>course.qaEntries.find(e=>e.id===id));
assert.ok(entries.every(e=>e?.tier==='cited'&&e.moduleId==='05-bhw-at-barangay'));
const url=projectUrl('ltzicxyefizxoqhfuuzc'),key=requireEnv('KB_LOADER_ANON_KEY');
const token=await signIn(url,key,requireEnv('KB_LOADER_USERNAME'),requireEnv('KB_LOADER_PASSWORD'));
const client=createClient(url,key,token);
const fields='id,category_id,question_fil,question_en,answer_fil,answer_en,keywords,image_url,owner_user_id,review_due_on,status,content_id';
const before=[];
for(const entry of entries){
 const query=new URLSearchParams({select:fields,or:`(content_id.eq.${entry.id},question_en.eq."${entry.question_en}")`,limit:'2'});
 const rows=await client.get('kb_entries?'+query);
 assert.equal(rows.length,1,'Reconcile unique existing KB row for '+entry.id);
 assert.ok(!rows[0].content_id||rows[0].content_id===entry.id,'Conflicting content ID');
 before.push(rows[0]);
}
assert.equal(new Set(before.map(r=>r.id)).size,2);
fs.writeFileSync('lesson-155-kb-before.json',JSON.stringify({mode:apply?'apply':'dry-run',ids,rows:before},null,2)+'\n');
let publisherId=null;
if(before.some(r=>!r.owner_user_id)){const publishers=await client.get('users?'+new URLSearchParams({select:'id,role',username:'eq.'+requireEnv('KB_LOADER_USERNAME'),limit:'1'}));assert.equal(publishers.length,1);assert.equal(publishers[0].role,'admin');publisherId=publishers[0].id;}
const approval=JSON.parse(fs.readFileSync('docs/lesson-155-owner-approval.json','utf8'));
const after=[];
for(const [i,entry]of entries.entries()){
 const old=before[i];
 const desired={...old,question_fil:entry.question_fil,question_en:entry.question_en,answer_fil:renderAnswer(entry,course.sources,'fil'),answer_en:renderAnswer(entry,course.sources,'en'),keywords:entry.keywords,status:'published',content_id:entry.id,owner_user_id:old.owner_user_id??publisherId,review_due_on:old.review_due_on??reviewDueOn(entry,new Date(approval.approved_at))};
 if(apply){
  if(JSON.stringify(desired)!==JSON.stringify(old)){
   await client.rpc('rpc_kb_entry_update',{p_id:old.id,p_category_id:old.category_id,p_question_fil:desired.question_fil,p_question_en:desired.question_en,p_answer_fil:desired.answer_fil,p_answer_en:desired.answer_en,p_keywords:desired.keywords,p_image_url:old.image_url,p_owner_user_id:desired.owner_user_id,p_review_due_on:desired.review_due_on,p_status:'published'});
   if(old.content_id!==entry.id)await client.patch('kb_entries?id=eq.'+old.id,{content_id:entry.id});
  }
  const actual=await client.get('kb_entries?'+new URLSearchParams({select:fields,id:'eq.'+old.id,limit:'1'}));
  assert.equal(actual.length,1);assert.deepEqual(actual[0],desired,'Published answer must exactly match approved source and retain identity and existing owners');
  after.push(actual[0]);
 }else after.push(desired);
}
fs.writeFileSync('lesson-155-kb-after.json',JSON.stringify({mode:apply?'apply':'dry-run',ids,rows:after},null,2)+'\n');
console.log(`${apply?'Published and verified':'Dry-run verified'} exactly two self-management answers; existing IDs/categories retained; missing owners assigned to the publishing admin.`);

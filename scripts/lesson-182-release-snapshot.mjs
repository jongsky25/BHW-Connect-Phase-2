// Release-only bounded snapshot: one approved lesson and eighteen protected neighbors.
// Uses the ordinary loader admin and never reads learner identities or progress.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadReferenceModule,contentHash} from './lib/reference-content.mjs';
import {createClient,signIn,requireEnv} from './lib/supabase-rest.mjs';

const phase=process.argv[2];
assert.ok(['before','after'].includes(phase),'Use before or after');
const approval=JSON.parse(fs.readFileSync('docs/lesson-182-owner-approval.json'));
const lock=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json'));
assert.deepEqual(approval.lesson_keys,['safety-controls']);
const targets=Object.fromEntries(approval.lesson_keys.map(k=>[k,lock.lessons['08-osh'][k]]));
const ids=[...Object.values(lock.lessons['08-osh']),...Object.values(lock.lessons['07-problema']),...Object.values(lock.lessons['06-komunikasyon']),...Object.values(lock.lessons['05-bhw-at-barangay'])];
assert.equal(ids.length,19);assert.equal(new Set(ids).size,19);
const original=phase==='after'?JSON.parse(fs.readFileSync('lesson-182-before.json')):null;
const url='https://ltzicxyefizxoqhfuuzc.supabase.co',key=requireEnv('KB_LOADER_ANON_KEY');
const token=await signIn(url,key,requireEnv('KB_LOADER_USERNAME'),requireEnv('KB_LOADER_PASSWORD'));
const client=createClient(url,key,token);
const lessons=await client.get(`course_lessons?select=id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en,required,published_revision_id&id=in.(${ids.join(',')})&order=id&limit=19`);
assert.equal(lessons.length,19);
const rows=[];
for(const lesson of lessons){
 assert.ok(lesson.published_revision_id);
 const revisions=await client.get(`course_lesson_revisions?select=id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id&id=eq.${lesson.published_revision_id}&limit=1`);
 assert.equal(revisions.length,1);
 const private_notes=await client.get(`course_lesson_facilitator_notes?select=revision_id,notes_fil,notes_en,observation_indicators&revision_id=eq.${lesson.published_revision_id}&limit=1`);
 rows.push({lesson,revision:revisions[0],private_notes});
}
if(phase==='after'){
 const old=new Map(original.rows.map(r=>[r.lesson.id,r]));
 assert.deepEqual(rows.map(r=>r.lesson.id).sort(),[...old.keys()].sort());
 const authored=loadReferenceModule('content/training/day1-basic-competencies/modules/08-osh','public');
 for(const row of rows){
  const prior=old.get(row.lesson.id);
  if(!Object.values(targets).includes(row.lesson.id)){assert.deepEqual(row,prior,'Protected published lesson changed');continue;}
  assert.deepEqual({...row.lesson,published_revision_id:prior.lesson.published_revision_id},prior.lesson,'Lesson identity or manifest changed');
  const lesson=authored.lessons.find(l=>l.manifest.lesson_key===row.lesson.lesson_key);assert.ok(lesson);
  assert.equal(row.revision.content_hash,contentHash(lesson));
  for(const field of ['read_sections','slides','coverage','sources','assets','featured_asset_id'])assert.deepEqual(row.revision[field],lesson.revision[field],field);
  assert.equal(row.private_notes.length,1);
  for(const [field,value]of Object.entries(lesson.notes))assert.deepEqual(row.private_notes[0][field],value,'Private guide '+field);
 }
}
const record={captured_at:new Date().toISOString(),source_commit:process.env.GITHUB_SHA??null,phase,method:'19 bounded published lesson/revision/private-guide rows; no learner identities or progress',approved_keys:approval.lesson_keys,rows};
fs.writeFileSync(`lesson-182-${phase}.json`,JSON.stringify(record,null,2)+'\n');
console.log(`Verified ${phase}: ${phase==='before'?'nineteen published baselines':'one approved revision and eighteen exactly unchanged neighbors'}.`);

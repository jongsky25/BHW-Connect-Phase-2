// Twelve bounded, read-only published lesson/revision/private-guide rows.
// Never queries learner identities or progress.
import {readFileSync,writeFileSync} from 'node:fs';
import {createClient,signIn,requireEnv} from './lib/supabase-rest.mjs';
import assert from 'node:assert/strict';

const phase=process.argv[2];
if(!['before','after'].includes(phase))throw Error('Use before or after');
const original=JSON.parse(readFileSync('docs/lesson-153-preapproval-published-snapshot.json','utf8'));
const lock=JSON.parse(readFileSync('content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json','utf8'));
const ids=[...Object.values(lock.lessons['05-bhw-at-barangay']),...Object.values(lock.lessons['04-ra7883']),lock.lessons['03-polisiya-bhs']['bhs-improvement']];
assert.equal(ids.length,12);assert.equal(new Set(ids).size,12);
const url='https://ltzicxyefizxoqhfuuzc.supabase.co',key=requireEnv('KB_LOADER_ANON_KEY');
const token=await signIn(url,key,requireEnv('KB_LOADER_USERNAME'),requireEnv('KB_LOADER_PASSWORD'));
const client=createClient(url,key,token);
const lessons=await client.get(`course_lessons?select=*&id=in.(${ids.join(',')})&order=id`);
assert.equal(lessons.length,12);
const rows=[];
for(const lesson of lessons){
  assert.ok(lesson.published_revision_id);
  const revisions=await client.get(`course_lesson_revisions?select=*&id=eq.${lesson.published_revision_id}`);
  assert.equal(revisions.length,1);
  const private_notes=await client.get(`course_lesson_facilitator_notes?select=*&revision_id=eq.${lesson.published_revision_id}`);
  rows.push({lesson,revision:revisions[0],private_notes});
}
const old=new Map(original.rows.map(r=>[r.lesson.lesson_key,r]));
const current=new Map(rows.map(r=>[r.lesson.lesson_key,r]));
assert.deepEqual([...current.keys()].sort(),[...old.keys()].sort());
for(const [key,row] of current){
  if(phase==='before'||key!=='bhw-local-partners')assert.deepEqual(row,old.get(key),`Published row changed: ${key}`);
}
if(phase==='after'){
  const target=current.get('bhw-local-partners'),previous=old.get('bhw-local-partners');
  assert.deepEqual({...target.lesson,published_revision_id:previous.lesson.published_revision_id},previous.lesson);
  assert.equal(target.revision.content_hash,'0249cce39969527f101d583c2a32d40305300cc762285f22dcb9db00f7055bdd');
  assert.equal(target.revision.read_sections.length,6);assert.equal(target.revision.slides.length,6);
  assert.equal(target.private_notes.length,1);
  assert.equal(target.private_notes[0].observation_indicators.length,1);
}
const record={captured_at:new Date().toISOString(),source_commit:process.env.GITHUB_SHA??null,phase,method:'12 bounded published lesson/revision/private-guide rows; no learners or progress',rows};
writeFileSync(`lesson-153-${phase}.json`,JSON.stringify(record,null,2)+'\n');
console.log(`Verified ${phase}: ${phase==='before'?'twelve old':'eleven retained and one approved target'} published rows.`);

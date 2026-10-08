import {loadReferenceModule,contentHash} from './lib/reference-content.mjs';
// Twelve bounded, read-only published lesson/revision/private-guide rows.
// Never queries learner identities or progress.
import {readFileSync,writeFileSync} from 'node:fs';
import {createClient,signIn,requireEnv} from './lib/supabase-rest.mjs';
import assert from 'node:assert/strict';

const phase=process.argv[2];
if(!['before','after'].includes(phase))throw Error('Use before or after');
const original=phase==='after'?JSON.parse(readFileSync('lesson-155-before.json','utf8')):null;
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
const old=new Map((original?.rows??rows).map(r=>[r.lesson.lesson_key,r]));
const current=new Map(rows.map(r=>[r.lesson.lesson_key,r]));
assert.deepEqual([...current.keys()].sort(),[...old.keys()].sort());
for(const [key,row] of current){
  if(phase==='before'||key!=='bhw-self-management')assert.deepEqual(row,old.get(key),`Published row changed: ${key}`);
}
if(phase==='after'){
  const target=current.get('bhw-self-management'),previous=old.get('bhw-self-management');
  assert.deepEqual({...target.lesson,published_revision_id:previous.lesson.published_revision_id},previous.lesson);
  const authored=loadReferenceModule('content/training/day1-basic-competencies/modules/05-bhw-at-barangay','public').lessons.find(l=>l.manifest.lesson_key==='bhw-self-management');
  assert.equal(target.revision.content_hash,contentHash(authored));
  assert.deepEqual(target.revision.read_sections,authored.revision.read_sections);
  assert.deepEqual(target.revision.slides,authored.revision.slides);
  assert.deepEqual(target.revision.assets,authored.revision.assets);
  assert.equal(target.revision.read_sections.length,7);assert.equal(target.revision.slides.length,7);
  assert.equal(target.private_notes.length,1);
  assert.equal(target.private_notes[0].observation_indicators.length,1);
  for(const field of ['notes_fil','notes_en','observation_indicators'])assert.deepEqual(target.private_notes[0][field],authored.notes[field]);
}
const record={captured_at:new Date().toISOString(),source_commit:process.env.GITHUB_SHA??null,phase,method:'12 bounded published lesson/revision/private-guide rows; no learners or progress',rows};
writeFileSync(`lesson-155-${phase}.json`,JSON.stringify(record,null,2)+'\n');
console.log(`Verified ${phase}: ${phase==='before'?'twelve old':'eleven retained and one approved target'} published rows.`);

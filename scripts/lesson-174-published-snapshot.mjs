// Bounded published-content baseline through loader admin. No learner data/writes.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {createClient,signIn,requireEnv} from './lib/supabase-rest.mjs';
const lock=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json'));
const ids=[...Object.values(lock.lessons['07-problema']),...Object.values(lock.lessons['06-komunikasyon'])];
assert.equal(ids.length,9);assert.equal(new Set(ids).size,9);
const url='https://ltzicxyefizxoqhfuuzc.supabase.co',key=requireEnv('KB_LOADER_ANON_KEY');
const token=await signIn(url,key,requireEnv('KB_LOADER_USERNAME'),requireEnv('KB_LOADER_PASSWORD'));
const client=createClient(url,key,token);
const lessons=await client.get(`course_lessons?select=id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en,required,published_revision_id&id=in.(${ids.join(',')})&order=id&limit=9`);assert.equal(lessons.length,9);
const rows=[];
for(const lesson of lessons){
 assert(lesson.published_revision_id);
 const revisions=await client.get(`course_lesson_revisions?select=id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id&id=eq.${lesson.published_revision_id}&limit=1`);assert.equal(revisions.length,1);
 const private_notes=await client.get(`course_lesson_facilitator_notes?select=revision_id,notes_fil,notes_en,observation_indicators&revision_id=eq.${lesson.published_revision_id}&limit=1`);assert.equal(private_notes.length,1);
 rows.push({lesson,revision:revisions[0],private_notes});
}
fs.writeFileSync('lesson-174-published-snapshot.json',JSON.stringify({captured_at:new Date().toISOString(),source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'Nine bounded authored lesson/revision/private-guide records via existing loader; read-only. No learner identities/progress queried.',rows},null,2)+'\n');
console.log('Captured target and eight protected published lessons read-only.');

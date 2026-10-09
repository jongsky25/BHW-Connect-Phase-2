import {execFileSync} from 'node:child_process';
// Bounded, read-only baseline through the existing loader account. No writes.
import {readFileSync,writeFileSync} from 'node:fs';
import {createClient,signIn,requireEnv} from './lib/supabase-rest.mjs';
const lock=JSON.parse(readFileSync('content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json','utf8'));
const ids=Object.values(lock.lessons['07-problema']);
if(ids.length!==4||new Set(ids).size!==4)throw Error('Unexpected bounded lesson identity set');
const url='https://ltzicxyefizxoqhfuuzc.supabase.co',key=requireEnv('KB_LOADER_ANON_KEY');
const token=await signIn(url,key,requireEnv('KB_LOADER_USERNAME'),requireEnv('KB_LOADER_PASSWORD'));
const client=createClient(url,key,token);
const rows=await client.get(`course_lessons?select=*&id=in.(${ids.join(',')})&order=id`);
if(rows.length!==4)throw Error('Bounded published lessons are incomplete');
const snapshot=[];
for(const lesson of rows){
 if(!lesson.published_revision_id)throw Error('Missing published pointer');
 const revisions=await client.get(`course_lesson_revisions?select=*&id=eq.${lesson.published_revision_id}`);
 if(revisions.length!==1)throw Error('Published revision unavailable');
 const notes=await client.get(`course_lesson_facilitator_notes?select=*&revision_id=eq.${lesson.published_revision_id}`);
 snapshot.push({lesson,revision:revisions[0],private_notes:notes});
}
writeFileSync('lesson-171-published-snapshot.json',JSON.stringify({captured_at:new Date().toISOString(),source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'4 bounded published lesson/revision/private-note rows via loader admin; read-only; no learner identities or progress retrieved',rows:snapshot},null,2)+'\n');
console.log('Read-only snapshot complete: one target plus three protected published lessons.');

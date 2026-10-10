// Exact baseline and non-target preservation; no historical test exemptions.
import {beforeProposed182} from './lib/lesson-182-integration.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const b=j('docs/lesson-182-handoff-baseline.json'),execution=j('docs/lesson-182-integrated-baseline.json');const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-controls/';
const narrationPath='content/training/day1-basic-competencies/narration.json';let protectedCount=0;
for(const [p,h]of Object.entries(execution.protected_sha256)){if(p===narrationPath)continue;const v=fs.lstatSync(p).isSymbolicLink()?Buffer.from(fs.readlinkSync(p)):fs.readFileSync(p);assert.equal(sha(beforeProposed182(p,v)),h,p);protectedCount++;}
const oldNarration=JSON.parse(execFileSync('git',['show',execution.source_commit+':'+narrationPath],{maxBuffer:30*1024*1024})),current=j(narrationPath);
for(const [key,v]of Object.entries(oldNarration.lessons))if(key!=='safety-controls')assert.deepEqual(current.lessons[key],v,'Narration '+key);
for(const [key,v]of Object.entries(oldNarration.history??{}))assert.deepEqual(current.history?.[key]?.slice(0,v.length),v,'History '+key);
for(const [key,v]of Object.entries(oldNarration))if(!['lessons','history'].includes(key))assert.deepEqual(current[key],v,'Narration metadata '+key);
const targetChanged=JSON.stringify(current.lessons['safety-controls'])!==JSON.stringify(oldNarration.lessons['safety-controls']);if(targetChanged)assert(current.history['safety-controls'].some(x=>JSON.stringify(x)===JSON.stringify(oldNarration.lessons['safety-controls'])),'Original target selection retained in history');
const original=JSON.parse(b.target_files_utf8[leaf+'lesson.json']),lesson=j(leaf+'lesson.json'),slides=j(leaf+'slides.json');assert.deepEqual(lesson.manifest,b.manifest);assert.deepEqual(lesson.coverage,b.coverage);assert.deepEqual(lesson.sections.map(({id,concept_ids})=>({id,concept_ids})),b.anchors);assert.deepEqual(slides.map(({id,concept_ids})=>({id,concept_ids})),b.slide_anchors);
for(const check of [lesson.sections.at(-1).check,slides.at(-1).check])for(const key of ['prompt_fil','prompt_en','options','correct_option_index'])assert.deepEqual(check[key],b.original_check[key]);
const headings=['purpose','time-materials','prepare','opening','steps','expected-answers','misconception','practice','answer-key','observe','support','sources-review'];
for(const lang of ['fil','en']){const read=fs.readFileSync(leaf+'read.'+lang+'.md','utf8');const screens=read.split(/^## /m).slice(1);assert.equal(screens.length,6);screens.forEach((s,i)=>{const [heading,...body]=s.split('\n');assert.equal(heading,`[${lesson.sections[i].id}] ${slides[i]['heading_'+lang]}`);assert.equal(body.join('\n').trim(),slides[i]['narration_'+lang]);});assert.deepEqual([...fs.readFileSync(leaf+'facilitator.'+lang+'.md','utf8').matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1]),headings);}
const rubric=j(leaf+'competency.json').observation_indicators;assert.equal(rubric.length,1);assert.equal(rubric[0].objective_index,0);assert.equal(Object.keys(rubric[0].levels).length,6);
assert.deepEqual(lesson.assets.slice(0,original.assets.length),original.assets);
const changed=Object.fromEntries(Object.keys(b.target_files_sha256).map(p=>[p,{predecessor_sha256:b.target_files_sha256[p],proposed_sha256:sha(fs.readFileSync(p))}]));
const report={status:'passed',source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),protected_entries_verified:protectedCount,manifest_anchors_concepts_coverage_quiz_preserved:true,private_headings_and_bilingual_read_slides_match:true,non_target_narration_and_history_preserved:true,target_narration_changed:targetChanged,original_target_selection_in_history:targetChanged,changed_existing_files:changed};
fs.writeFileSync('docs/lesson-182-preservation.json',JSON.stringify(report,null,2)+'\n');console.log('Preservation passed:',protectedCount,'protected entries; bilingual teaching/quiz/identity exact');

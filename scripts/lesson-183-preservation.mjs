// Exact non-target protection and semantic target preservation against the handoff.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const b=read('docs/lesson-183-implementation-baseline.json'),handoff=read('docs/lesson-183-handoff-baseline.json');
const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-prepare/';
const narrationPath='content/training/day1-basic-competencies/narration.json';
let count=0;
for(const [p,h]of Object.entries(b.protected_sha256)){
 if(p===narrationPath)continue;
 assert.equal(sha(fs.readFileSync(p)),h,p);count++;
}
const current=read(narrationPath);
const stable=v=>{if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;};
const nonTarget={...current,lessons:Object.fromEntries(Object.entries(current.lessons).filter(([k])=>k!=='safety-prepare')),history:Object.fromEntries(Object.entries(current.history??{}).filter(([k])=>k!=='safety-prepare'))};
assert.equal(sha(Buffer.from(JSON.stringify(stable(nonTarget)))),b.narration_non_target_sha256,'Non-target narration fields');
if(JSON.stringify(current.lessons['safety-prepare'])!==JSON.stringify(b.narration_target))assert(current.history?.['safety-prepare']?.some(v=>JSON.stringify(v)===JSON.stringify(b.narration_target)),'Old target audio selection required in history');
if(b.narration_history)assert.deepEqual(current.history['safety-prepare'].slice(0,b.narration_history.length),b.narration_history);
const lesson=read(leaf+'lesson.json'),slides=read(leaf+'slides.json');
const old=JSON.parse(handoff.target_files_utf8[leaf+'lesson.json']);
assert.deepEqual(lesson.manifest,old.manifest);assert.equal(lesson.sections.length,6);assert.equal(slides.length,6);
assert.deepEqual(lesson.sections.filter(s=>s.id!=='verify-readiness').map(s=>[s.id,s.concept_ids]),old.sections.map(s=>[s.id,s.concept_ids]));
const quiz=lesson.sections.at(-1).check;
for(const k of ['prompt_fil','prompt_en','options','correct_option_index'])assert.deepEqual(quiz[k],old.sections.at(-1).check[k],k);
assert.deepEqual(slides.at(-1).check,quiz);
for(const lang of ['fil','en']){
 const md=fs.readFileSync(leaf+`read.${lang}.md`,'utf8');
 const sections=md.split(/^## /m).slice(1);
 for(const [i,s]of sections.entries()){
  assert.equal(s.split('\n').slice(2).join('\n').trim(),slides[i]['narration_'+lang]);
  assert(!/\bAna\b|\b33\b/.test(s));
 }
 assert.deepEqual([...fs.readFileSync(leaf+`facilitator.${lang}.md`,'utf8').matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1]),['purpose','time-materials','prepare','opening','steps','expected-answers','misconception','practice','answer-key','observe','support','sources-review']);
}
for(const c of old.coverage){const updated=lesson.coverage.find(v=>v.id===c.id);assert.deepEqual(updated.read_ids.filter(x=>x!=='verify-readiness'),c.read_ids);assert.deepEqual(updated.slide_ids.filter(x=>x!=='slide-verify-readiness'),c.slide_ids);assert.deepEqual(updated.source_ids,c.source_ids);}
assert.deepEqual(lesson.sources,old.sources);
const rubric=read(leaf+'competency.json').observation_indicators;assert.equal(rubric.length,1);assert.equal(rubric[0].objective_index,0);assert.equal(Object.keys(rubric[0].levels).length,6);
const report={status:'passed',protected_files:count,manifest_uuid_sources_siblings_registry_ui_provider:'exact preserved hashes',old_narration_selection:'preserved current or in append-only history',original_quiz:'exact prompts/options/correct index 1',read_slides:'six paired full texts',guides:'twelve ordered headings',rubric:'one indicator, six bilingual levels'};
fs.writeFileSync('docs/lesson-183-preservation.json',JSON.stringify(report,null,2)+'\n');console.log(report);

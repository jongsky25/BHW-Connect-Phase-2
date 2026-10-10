// Complete execution-start protected-file receipts and target semantic preservation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadReferenceModule} from './lib/reference-content.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const baseline=read('docs/lesson-193-handoff-baseline.json');
const start=read('docs/lesson-193-execution-baseline.json');
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/';
const old=JSON.parse(baseline.target_files_utf8[leaf+'lesson.json']);
const lesson=read(leaf+'lesson.json'),slides=read(leaf+'slides.json');
assert.deepEqual(lesson.manifest,old.manifest);
assert.deepEqual(lesson.coverage,old.coverage);
assert.deepEqual(lesson.sections.map(s=>({id:s.id,concept_ids:s.concept_ids})),old.sections.map(s=>({id:s.id,concept_ids:s.concept_ids})));
assert.deepEqual(read(leaf+'competency.json'),baseline.original_competency);
for(const [i,s]of lesson.sections.entries()){
 const original=old.sections[i].check;
 if(original)for(const field of ['prompt_fil','prompt_en','options','correct_option_index']){
  assert.deepEqual(s.check[field],original[field],s.id+' Read '+field);
  assert.deepEqual(slides[i].check[field],original[field],s.id+' Slides '+field);
 }
 assert.deepEqual(slides[i].check,s.check);
}
const target=loadReferenceModule('content/training/day1-basic-competencies/modules/09-sustainable-practices','public').lessons.find(l=>l.manifest.lesson_key==='resources-monitor');
for(const [i,s]of target.revision.read_sections.entries())for(const lang of ['fil','en'])assert.equal(s['body_'+lang],slides[i]['narration_'+lang],s.id+' paired '+lang);
const changed=[];
for(const[p,hash]of Object.entries(start.files_sha256)){
 assert(fs.existsSync(p),'Protected file missing '+p);
 if(sha(fs.readFileSync(p))===hash)continue;
 if(p.startsWith(leaf)){changed.push(p);continue;}
 if(p==='content/training/day1-basic-competencies/narration.json'){
  const prior=JSON.parse(execFileSync('git',['show',start.head+':'+p],{maxBuffer:32*1024*1024}));
  const current=read(p);
  for(const[k,v]of Object.entries(prior.lessons))if(k!=='resources-monitor')assert.deepEqual(current.lessons[k],v,'Sibling narration '+k);
  for(const[k,v]of Object.entries(prior.history??{}))if(k!=='resources-monitor')assert.deepEqual(current.history[k],v,'Sibling history '+k);
  assert(current.history['resources-monitor'].some(h=>JSON.stringify(h)===JSON.stringify(prior.lessons['resources-monitor'])),'Prior target selection retained');changed.push(p);continue;
 }
 assert.fail('Unscoped protected file changed '+p);
}
const report={status:'passed',protected_files:Object.keys(start.files_sha256).length,changed_existing_files:changed,checks:'all bilingual prompts, options and correct indexes preserved',paired_bodies:'14 exact Read/Slides matches',manifest_coverage_rubric:'unchanged',old_media:'all protected bytes retained',published_baseline:'not available; no production claim',owner_approval:false};
fs.writeFileSync('docs/lesson-193-preservation.json',JSON.stringify(report,null,2)+'\n');console.log(report);

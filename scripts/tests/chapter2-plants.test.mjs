// @vitest-environment node
import {test,beforeAll} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {JSDOM,VirtualConsole} from 'jsdom';
import {root,packageRoot,json,validateClinicalEvidence} from '../chapter2-validate.mjs';
import {loadReferenceModule} from '../lib/reference-content.mjs';
const dir=path.join(packageRoot,'drafts/05-medicinal-plants');
const chapterModule=loadReferenceModule(dir,path.join(root,'public'));
const evidence=()=>json(path.join(dir,'evidence-review.json'));
const output=path.join(root,'.preview/chapter2-plants');
beforeAll(()=>execFileSync(process.execPath,['scripts/chapter2-preview.mjs','--module','2.5','--output',output],{cwd:root}),60000);
function preview(file='chapter-2-learner-preview.html'){
 const errors=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
 const html=readFileSync(path.join(output,file),'utf8');const dom=new JSDOM(html,{runScripts:'dangerously',virtualConsole});
 assert.equal(errors.length,0);return {dom,doc:dom.window.document,html};
}
const lesson=(key)=>chapterModule.lessons.find(l=>l.manifest.lesson_key===key);
const prose=(key)=>lesson(key).revision.read_sections.map(s=>s.body_en).join(' ');
test('twelve plant lessons reconcile to the two-hour guide allocation',()=>{
 assert.equal(chapterModule.lessons.length,12);validateClinicalEvidence(chapterModule,evidence());
 const a=json(path.join(dir,'activities.json')).activities;assert.equal(a.reduce((n,x)=>n+x.minutes,0),120);
 assert.equal(a[0].minutes,10);assert.equal(a[11].minutes,30);assert.ok(a.slice(1,11).every(x=>x.minutes===8));
 assert.ok(json(path.join(dir,'review.json')).lessons.every(x=>x.clinical_content&&!x.publication_allowed&&x.independent_review===null));
});
test('the ten plants have distinct botanical names and source-associated parts',()=>{
 const x=evidence().plant_crosswalk;assert.equal(x.length,10);assert.equal(new Set(x.map(p=>p.botanical)).size,10);
 for(const p of x){assert.ok(p.part_en&&p.part_fil);assert.match(prose(p.lesson_key),new RegExp(p.botanical));}
});
test('PITAHC directory count discrepancy and remaining clinical questions are explicit',()=>{
 assert.match(evidence().directory_count_discrepancy,/“9 herbs”/);
 assert.equal(evidence().clinical_signoff,null);
 const e=evidence();e.decisions=e.decisions.filter(d=>!d.lessons.includes('niyog-niyogan'));
 assert.throws(()=>validateClinicalEvidence(chapterModule,e),/Every clinical lesson/);
});
test('metabolic plant lessons do not replace prescribed treatment',()=>{
 for(const key of ['ampalaya','bawang','ulasimang-bato']){
  const text=prose(key);assert.match(text,/Do not stop|Do not stop medicine|does not authorize a medication change/);
  assert.match(text,/clinician|health center/i);
 }
});
test('urgent concerns in Lagundi, Bayabas and Sambong cases go to clinical assessment',()=>{
 assert.match(prose('lagundi'),/difficulty breathing/);
 assert.match(prose('bayabas'),/pus/);
 assert.match(prose('sambong'),/severe side pain/);
 for(const key of ['lagundi','bayabas','sambong'])assert.match(prose(key),/assessment|health professional|health facility/i);
});
test('learner instructions exclude numeric plant doses and actual preparation',()=>{
 const text=chapterModule.lessons.flatMap(l=>l.revision.read_sections.map(s=>s.body_en)).join(' ');
 assert.ok(!/\b(?:cups?|tablespoons?|teaspoons?|seeds?)\s*(?:twice|thrice|3 times)|\b[½⅓]|\b\d+\s*(?:cups?|tablespoons?|teaspoons?)\b/i.test(text));
 assert.match(prose('plant-integrated-practice'),/dry props only/);
 assert.match(prose('plant-integrated-practice'),/No hot water/);
});
test('Chapter 2.3 owner approval is recorded without clinical sign-off',()=>{
 const approvals=json(path.join(packageRoot,'sample-review.json')).subsequent_owner_approvals;
 assert.ok(approvals.some(a=>a.modules.join(',')==='2.3'));
 const ipc=json(path.join(packageRoot,'drafts/03-infection-control/review.json'));
 assert.equal(ipc.owner_review.status,'approved-by-user');assert.ok(ipc.lessons.every(x=>!x.publication_allowed));
});
test('plant preview starts at 2.5.1 and keeps lesson attempts separate',()=>{
 const {dom,doc}=preview();assert.match(doc.getElementById('intro').textContent,/2.5.1/);assert.equal(doc.querySelectorAll('#lesson option').length,12);
 for(const i of [0,5,11]){
  const select=doc.getElementById('lesson');select.value=String(i);select.dispatchEvent(new dom.window.Event('change'));
  assert.equal(doc.getElementById('complete').disabled,true);
  for(let j=0;j<7;j++){const option=doc.querySelector('[data-answer="0"]');if(option)option.click();if(j<6)doc.getElementById('next').click();}
  assert.equal(doc.getElementById('complete').disabled,false);
 }
 dom.window.close();
});
test('participant workbook omits private answers and private kit keeps rubrics',()=>{
 const learner=preview('chapter-2-participant-workbook.html');assert.equal(learner.doc.querySelectorAll('.print-card').length,48);
 for(const l of chapterModule.lessons)assert.ok(!learner.html.includes(l.notes.observation_indicators[0].levels.kaya_na_en));
 learner.dom.window.close();
 const staff=preview('PRIVATE-chapter-2-facilitator-kit.html');assert.equal(staff.doc.querySelectorAll('.print-card').length,72);
 for(const l of chapterModule.lessons)assert.ok(staff.doc.body.textContent.includes(l.notes.observation_indicators[0].observable_fil));
 staff.dom.window.close();
});

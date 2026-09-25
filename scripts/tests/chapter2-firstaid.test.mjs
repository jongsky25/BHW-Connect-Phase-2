// @vitest-environment node
import {test,beforeAll} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {JSDOM,VirtualConsole} from 'jsdom';
import {root,packageRoot,json,validateClinicalEvidence} from '../chapter2-validate.mjs';
import {loadReferenceModule} from '../lib/reference-content.mjs';
const dir=path.join(packageRoot,'drafts/04-first-aid');
const chapterModule=loadReferenceModule(dir,path.join(root,'public'));
const evidence=()=>json(path.join(dir,'evidence-review.json'));
const output=path.join(root,'.preview/chapter2-firstaid');
beforeAll(()=>execFileSync(process.execPath,['scripts/chapter2-preview.mjs','--module','2.4','--output',output],{cwd:root}),60000);
function preview(file='chapter-2-learner-preview.html'){
 const errors=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
 const html=readFileSync(path.join(output,file),'utf8');
 const dom=new JSDOM(html,{runScripts:'dangerously',virtualConsole});assert.equal(errors.length,0);return {dom,doc:dom.window.document,html};
}
const lesson=(key)=>chapterModule.lessons.find(l=>l.manifest.lesson_key===key);
const prose=(key)=>lesson(key).revision.read_sections.map(s=>s.body_en).join(' ');
test('18 first-aid lessons reconcile to the seven-hour case and one-hour kit allocation',()=>{
 assert.equal(chapterModule.lessons.length,18);validateClinicalEvidence(chapterModule,evidence());
 const acts=json(path.join(dir,'activities.json')).activities;
 assert.equal(acts.reduce((n,a)=>n+a.minutes,0),480);
 assert.equal(acts.find(a=>a.lesson_key==='first-aid-kit').minutes,60);
 assert.equal(acts.filter(a=>a.lesson_key!=='first-aid-kit').reduce((n,a)=>n+a.minutes,0),420);
 assert.ok(json(path.join(dir,'review.json')).lessons.every(l=>l.clinical_content&&!l.publication_allowed&&l.independent_review===null));
});
test('clinical approval cannot be invented or left without a decision',()=>{
 const e=evidence();e.clinical_signoff='yes';assert.throws(()=>validateClinicalEvidence(chapterModule,e),/sign-off/);
 const e2=evidence();e2.decisions=e2.decisions.filter(d=>!d.lessons.includes('snakebite-response'));
 assert.throws(()=>validateClinicalEvidence(chapterModule,e2),/Every clinical lesson/);
});
test('poisoning case rejects legacy routine drinks and a fixed spill distance',()=>{
 const p=prose('poisoning-response');assert.match(p,/Do not induce vomiting/);assert.match(p,/fixed distance/);
 assert.ok(!/200[- ]metre|200[- ]meter|drink a lot of water/i.test(p));
});
test('choking and CPR cases separate adult and infant training and use manikins',()=>{
 assert.match(prose('choking-response'),/adult abdominal thrusts to an infant/);
 assert.match(prose('choking-response'),/manikins/);
 assert.match(prose('cpr-bls-orientation'),/qualified trainer/);
 assert.match(prose('cpr-bls-orientation'),/AED/);
});
test('ORS education follows the actual packet and continues breastfeeding when safe',()=>{
 const p=prose('diarrhea-dehydration');assert.match(p,/exact packet directions/);assert.match(p,/continued breastfeeding/);
 assert.ok(!/six teaspoons|half a teaspoon|one litre.*six/i.test(p));
});
test('medication and wound legacy claims are excluded from learner prescriptions',()=>{
 const p=prose('chest-pain-referral');assert.match(p,/Do not use the source manual/);assert.ok(!/80mg|four tablets|every eight hours/i.test(p));
 assert.match(prose('wounds-bleeding'),/firm direct pressure/);
 assert.match(prose('first-aid-kit'),/availability from authorization/);
});
test('every case has distinct diagrams and case-specific first responses',()=>{
 const a=chapterModule.lessons.map(l=>l.revision.assets[0].path);assert.equal(new Set(a).size,18);
 const responses=chapterModule.lessons.map(l=>l.revision.read_sections.find(s=>s.id==='check-start').check.options.find((_,i)=>i===l.revision.read_sections.find(s=>s.id==='check-start').check.correct_option_index).en);
 assert.equal(new Set(responses).size,18);
});
test('first-aid preview starts at 2.4.1 and isolates all eighteen lesson attempts',()=>{
 const {dom,doc}=preview();assert.match(doc.getElementById('intro').textContent,/2.4.1/);assert.equal(doc.querySelectorAll('#lesson option').length,18);
 for(const index of [0,7,17]){
  const choice=doc.getElementById('lesson');choice.value=String(index);choice.dispatchEvent(new dom.window.Event('change'));
  assert.equal(doc.getElementById('complete').disabled,true);
  for(let p=0;p<7;p++){const option=doc.querySelector('[data-answer="0"]');if(option)option.click();if(p<6)doc.getElementById('next').click();}
  assert.equal(doc.getElementById('complete').disabled,false);
 }
 dom.window.close();
});
test('participant workbook excludes private ratings for all eighteen lessons',()=>{
 const {dom,doc,html}=preview('chapter-2-participant-workbook.html');assert.equal(doc.querySelectorAll('.print-card').length,72);
 for(const l of chapterModule.lessons)assert.ok(!html.includes(l.notes.observation_indicators[0].levels.kaya_na_en));
 assert.ok(!html.includes('observation_indicators'));dom.window.close();
});
test('private facilitator kit includes bilingual rubrics for every lesson',()=>{
 const {dom,doc}=preview('PRIVATE-chapter-2-facilitator-kit.html');assert.equal(doc.querySelectorAll('.print-card').length,108);
 for(const l of chapterModule.lessons)assert.ok(doc.body.textContent.includes(l.notes.observation_indicators[0].observable_fil));
 const lang=doc.getElementById('language');lang.value='en';lang.dispatchEvent(new dom.window.Event('change'));
 assert.ok(doc.querySelector('[data-language="fil"]').classList.contains('hidden'));dom.window.close();
});

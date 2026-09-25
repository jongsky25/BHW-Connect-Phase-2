// @vitest-environment node
import {test,beforeAll} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {JSDOM,VirtualConsole} from 'jsdom';
import {root,packageRoot,json,validateClinicalEvidence} from '../chapter2-validate.mjs';
import {loadReferenceModule} from '../lib/reference-content.mjs';
const dir=path.join(packageRoot,'drafts/03-infection-control');
const chapterModule=loadReferenceModule(dir,path.join(root,'public'));
const evidence=()=>json(path.join(dir,'evidence-review.json'));
const output=path.join(root,'.preview/chapter2-ipc');
beforeAll(()=>execFileSync(process.execPath,['scripts/chapter2-preview.mjs','--module','2.3','--output',output],{cwd:root}),60000);
function preview(file='chapter-2-learner-preview.html'){
 const errors=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
 const html=readFileSync(path.join(output,file),'utf8');
 // DOM-only simulation; no browser, network, layout or clinical validation.
 const dom=new JSDOM(html,{runScripts:'dangerously',virtualConsole});assert.equal(errors.length,0);return {dom,doc:dom.window.document,html};
}
test('all seven IPC lessons have dated evidence decisions without clinical sign-off',()=>{
 assert.equal(chapterModule.lessons.length,7);validateClinicalEvidence(chapterModule,evidence());
 const r=json(path.join(dir,'review.json'));assert.ok(r.lessons.every(l=>l.clinical_content&&l.publication_allowed===false));
 assert.equal(json(path.join(dir,'activities.json')).activities.reduce((n,a)=>n+a.minutes,0),600);
});
test('reject invented clinical approval',()=>{const e=evidence();e.clinical_signoff='approved';assert.throws(()=>validateClinicalEvidence(chapterModule,e),/sign-off/);});
test('reject omitted clinical lesson decisions',()=>{const e=evidence();e.decisions=e.decisions.filter(d=>!d.lessons.includes('hand-hygiene'));assert.throws(()=>validateClinicalEvidence(chapterModule,e),/Every clinical lesson/);});
test('reject untraceable evidence references',()=>{const e=evidence();e.decisions[0].sources=['invented-source'];assert.throws(()=>validateClinicalEvidence(chapterModule,e),/unknown source/);});
test('handwashing and handrub timing remain distinct in both languages and modes',()=>{
 const l=chapterModule.lessons.find(l=>l.manifest.lesson_key==='hand-hygiene');
 for(const lang of ['fil','en'])for(const mode of ['read_sections','slides']){
  const s=l.revision[mode].find(s=>s.id.replace('slide-','')==='example');const text=s[(mode==='slides'?'display_':'body_')+lang];
  assert.match(text,/40–60/);assert.match(text,/20–30/);assert.match(text,/handrub/i);
 }
 for(const lang of ['fil','en']){
  const worksheet=readFileSync(path.join(dir,'lessons/hand-hygiene',`worksheet.${lang}.md`),'utf8');
  for(const marker of ['40–60','20–30','single-use','Handwash','Handrub'])assert.ok(worksheet.includes(marker));
  assert.ok(worksheet.includes(lang==='en'?'Each':'Bawat')||worksheet.includes(lang==='en'?'each':'bawat'));
 }
});
test('water lesson avoids the unverified numeric treatment and setback instructions',()=>{
 const l=chapterModule.lessons.find(l=>l.manifest.lesson_key==='food-water-sanitation');
 for(const lang of ['fil','en']){
  const prose=l.revision.read_sections.map(s=>s['body_'+lang]).join(' ');
  assert.ok(!/25\s*(meters|metres|metro)|two\s+minutes|dalawang\s*\(?2?\)?\s*minuto/i.test(prose));
  assert.match(prose,/chlorine/);assert.match(prose,/sanitary inspector/i);
 }
});
test('policy worksheet retains ten policy topics and ten training topics',()=>{
 for(const lang of ['fil','en']){
  const worksheet=readFileSync(path.join(dir,'lessons/bhs-ipc-policies',`worksheet.${lang}.md`),'utf8');
  const rows=worksheet.split(/\r?\n/).filter(l=>l.startsWith('|')&&!l.includes('---'));
  assert.equal(rows.length,22);assert.match(worksheet,/HIV/);assert.match(worksheet,/Rational antibiotic use/);
 }
});
test('IPC preview starts at 2.3.1 and gates all seven lessons independently',()=>{
 const {dom,doc}=preview();assert.match(doc.getElementById('intro').textContent,/2.3.1/);assert.equal(doc.querySelectorAll('#lesson option').length,7);
 for(let i=0;i<7;i++){
  const choice=doc.getElementById('lesson');choice.value=String(i);choice.dispatchEvent(new dom.window.Event('change'));
  assert.equal(doc.getElementById('complete').disabled,true);
  for(let p=0;p<7;p++){const option=doc.querySelector('[data-answer="0"]');if(option){assert.equal(doc.querySelector('.feedback'),null);option.click();}if(p<6)doc.getElementById('next').click();}
  assert.equal(doc.getElementById('complete').disabled,false);
 }
 dom.window.close();
});
test('IPC language and mode changes retain only the current lesson attempts',()=>{
 const {dom,doc}=preview();doc.getElementById('next').click();doc.getElementById('next').click();doc.querySelector('[data-answer="0"]').click();
 for(const [id,value] of [['language','en'],['mode','slides']]){const control=doc.getElementById(id);control.value=value;control.dispatchEvent(new dom.window.Event('change'));}
 assert.ok(doc.querySelector('.feedback'));assert.equal(doc.documentElement.lang,'en');
 const lesson=doc.getElementById('lesson');lesson.value='1';lesson.dispatchEvent(new dom.window.Event('change'));doc.getElementById('next').click();doc.getElementById('next').click();assert.equal(doc.querySelector('.feedback'),null);dom.window.close();
});
test('IPC workbook omits private ratings and has all fourteen participant worksheets',()=>{
 const {dom,doc,html}=preview('chapter-2-participant-workbook.html');assert.equal(doc.querySelectorAll('.print-card').length,28);
 for(const l of chapterModule.lessons)assert.ok(!html.includes(l.notes.observation_indicators[0].levels.kaya_na_en));
 assert.ok(!html.includes('observation_indicators'));assert.match(doc.body.textContent,/40–60/);dom.window.close();
});
test('IPC private kit contains every canonical rubric and selects one print language',()=>{
 const {dom,doc}=preview('PRIVATE-chapter-2-facilitator-kit.html');assert.equal(doc.querySelectorAll('.print-card').length,42);
 for(const l of chapterModule.lessons)assert.ok(doc.body.textContent.includes(l.notes.observation_indicators[0].observable_fil));
 const lang=doc.getElementById('language');lang.value='en';lang.dispatchEvent(new dom.window.Event('change'));assert.ok(doc.querySelector('[data-language="fil"]').classList.contains('hidden'));dom.window.close();
});


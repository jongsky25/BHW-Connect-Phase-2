// @vitest-environment node
import {test,beforeAll} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {JSDOM,VirtualConsole} from 'jsdom';
import {root,packageRoot,json} from '../chapter2-validate.mjs';
const codes=['2.2','2.6'];
const folder=(code)=>path.join(root,'.preview/chapter2-batch2',code);
beforeAll(()=>{
 for(const code of codes)execFileSync(process.execPath,['scripts/chapter2-preview.mjs','--module',code,'--output',folder(code)],{cwd:root});
},60000);
function preview(code,file='chapter-2-learner-preview.html'){
 const errors=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
 const html=readFileSync(path.join(folder(code),file),'utf8');
 // In-memory DOM simulation only; no browser, navigation, network or layout rendering.
 const dom=new JSDOM(html,{runScripts:'dangerously',virtualConsole});
 assert.equal(errors.length,0,errors.map(String).join('\n'));return {dom,doc:dom.window.document,html};
}
for(const code of codes){
 test(`${code} has its own four lesson identities and bilingual module title`,()=>{
  const {dom,doc}=preview(code);assert.equal(doc.querySelectorAll('#lesson option').length,4);
  for(const option of doc.querySelectorAll('#lesson option'))assert.ok(option.textContent.startsWith(code+'.'));
  const lang=doc.getElementById('language');lang.value='en';lang.dispatchEvent(new dom.window.Event('change'));
  const plan=json(path.join(packageRoot,'chapter-blueprint.json')).modules.find(m=>m.code===code);
  assert.match(doc.getElementById('module-title').textContent,new RegExp(plan.title_en));dom.window.close();
 });
 test(`${code} every lesson requires its own two checks before preview completion`,()=>{
  const {dom,doc}=preview(code);
  for(let i=0;i<4;i++){
   const select=doc.getElementById('lesson');select.value=String(i);select.dispatchEvent(new dom.window.Event('change'));
   assert.equal(doc.getElementById('complete').disabled,true);
   for(let p=0;p<7;p++){
    const option=doc.querySelector('[data-answer="0"]');
    if(option){assert.equal(doc.querySelector('.feedback'),null);option.click();assert.equal(doc.activeElement,doc.querySelector('.feedback'));}
    if(p<6)doc.getElementById('next').click();
   }
   assert.equal(doc.getElementById('complete').disabled,false);
  }
  dom.window.close();
 });
 test(`${code} participant workbook omits staff answers and rating anchors`,()=>{
  const {dom,doc,html}=preview(code,'chapter-2-participant-workbook.html');
  assert.equal(doc.querySelectorAll('.print-card').length,16);
  for(const term of ['Kaya na:','Needs practice:','observation_indicators','Check explanations','Paliwanag sa checks'])assert.ok(!html.includes(term),term);
  const plan=json(path.join(packageRoot,'chapter-blueprint.json')).modules.find(m=>m.code===code);
  for(const l of plan.lessons){const c=json(path.join(packageRoot,'drafts',plan.module_key,'lessons',l.lesson_key,'competency.json'));assert.ok(!html.includes(c.observation_indicators[0].levels.kaya_na_en));}
  const lang=doc.getElementById('language');lang.value='en';lang.dispatchEvent(new dom.window.Event('change'));
  assert.ok(doc.querySelector('[data-language="fil"]').classList.contains('hidden'));dom.window.close();
 });
 test(`${code} private kit includes worksheets and every canonical observation rubric`,()=>{
  const {dom,doc}=preview(code,'PRIVATE-chapter-2-facilitator-kit.html');assert.equal(doc.querySelectorAll('.print-card').length,24);
  const plan=json(path.join(packageRoot,'chapter-blueprint.json')).modules.find(m=>m.code===code);
  for(const l of plan.lessons){const c=json(path.join(packageRoot,'drafts',plan.module_key,'lessons',l.lesson_key,'competency.json'));assert.ok(doc.body.textContent.includes(c.observation_indicators[0].observable_en));}
  assert.ok(doc.querySelectorAll('table').length>=8);dom.window.close();
 });
}
test('outline-only modules cannot generate a misleading learner preview',()=>{
 assert.throws(()=>execFileSync(process.execPath,['scripts/chapter2-preview.mjs','--module','2.4','--output',path.join(root,'.preview/unwritten')],{cwd:root,stdio:'pipe'}),/Select an authored draft/);
});

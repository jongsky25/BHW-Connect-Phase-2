// @vitest-environment node
import {test,beforeAll} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {JSDOM,VirtualConsole} from 'jsdom';
import {root} from '../chapter2-validate.mjs';
const output=path.join(root,'.preview/chapter2-unit-review');
beforeAll(()=>{mkdirSync(output,{recursive:true});execFileSync(process.execPath,['scripts/chapter2-preview.mjs','--output',output],{cwd:root});});
function preview(file='chapter-2-learner-preview.html'){
 const errors=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
 const html=readFileSync(path.join(output,file),'utf8');
 // DOM unit simulation only: no real browser, navigation, network or layout rendering.
 const dom=new JSDOM(html,{runScripts:'dangerously',virtualConsole});
 assert.equal(errors.length,0,errors.map(String).join('\n'));return {dom,doc:dom.window.document,html};
}
test('learner HTML excludes private guides, rubrics and activity records',()=>{const {dom,html}=preview();for(const key of ['observation_indicators','kaya_na_fil','indicator_ref','notes_fil','facilitator.fil.md'])assert.ok(!html.includes(key),key);dom.window.close();});
test('answers are hidden until attempted and completion requires both checks plus last section',()=>{const {dom,doc}=preview();const next=()=>doc.getElementById('next').click();assert.equal(doc.getElementById('complete').disabled,true);next();next();assert.equal(doc.querySelector('.feedback'),null);doc.querySelector('[data-answer="0"]').click();assert.ok(doc.querySelector('.feedback'));next();next();next();next();assert.equal(doc.getElementById('complete').disabled,true);doc.getElementById('previous').click();doc.querySelector('[data-answer="1"]').click();next();assert.equal(doc.getElementById('complete').disabled,false);doc.getElementById('complete').click();assert.match(doc.getElementById('status').textContent,/preview/);assert.ok(doc.getElementById('status').querySelector('button'));dom.window.close();});
test('language and modality switches preserve position and attempts within the preview',()=>{const {dom,doc}=preview();doc.getElementById('next').click();doc.getElementById('next').click();doc.querySelector('[data-answer="2"]').click();const mode=doc.getElementById('mode');mode.value='slides';mode.dispatchEvent(new dom.window.Event('change'));assert.ok(doc.querySelector('.feedback'));const lang=doc.getElementById('language');lang.value='en';lang.dispatchEvent(new dom.window.Event('change'));assert.equal(doc.documentElement.lang,'en');assert.ok(doc.querySelector('.feedback'));assert.match(doc.getElementById('intro').textContent,/3 \/ 7/);dom.window.close();});
test('next lesson resets the position without transferring answers to another lesson',()=>{const {dom,doc}=preview();for(let p=0;p<7;p++){doc.querySelector('[data-answer="0"]')?.click();if(p<6)doc.getElementById('next').click();}doc.getElementById('complete').click();doc.getElementById('status').querySelector('button').click();assert.match(doc.getElementById('intro').textContent,/2.1.3/);assert.equal(doc.getElementById('complete').disabled,true);doc.getElementById('next').click();doc.getElementById('next').click();assert.equal(doc.querySelector('.feedback'),null);dom.window.close();});
test('private kit has printable tables and only the selected language is visible',()=>{const {dom,doc}=preview('PRIVATE-chapter-2-facilitator-kit.html');assert.equal(doc.querySelectorAll('table').length,8);assert.equal(doc.querySelector('[data-language="en"]').classList.contains('hidden'),true);const lang=doc.getElementById('language');lang.value='en';lang.dispatchEvent(new dom.window.Event('change'));assert.equal(doc.querySelector('[data-language="fil"]').classList.contains('hidden'),true);assert.equal(doc.querySelector('[data-language="en"]').classList.contains('hidden'),false);dom.window.close();});

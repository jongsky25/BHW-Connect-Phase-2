// @vitest-environment node
import {test,beforeAll} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {JSDOM,VirtualConsole} from 'jsdom';
import {root,packageRoot,json,validateClinicalEvidence,validateDraftModule} from '../chapter2-validate.mjs';
import {loadReferenceModule} from '../lib/reference-content.mjs';

const dir=path.join(packageRoot,'drafts/07-disaster-preparedness');
const chapter=loadReferenceModule(dir,path.join(root,'public'));
const evidence=()=>json(path.join(dir,'evidence-review.json'));
const out=path.join(root,'.preview/chapter2-drrm');
beforeAll(()=>execFileSync(process.execPath,['scripts/chapter2-preview.mjs','--module','2.7','--output',out],{cwd:root}),60000);
const prose=(key)=>chapter.lessons.find(l=>l.manifest.lesson_key===key).revision.read_sections.map(s=>s.body_en).join(' ');
function preview(file='chapter-2-learner-preview.html'){
 const errors=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
 const html=readFileSync(path.join(out,file),'utf8');const dom=new JSDOM(html,{runScripts:'dangerously',virtualConsole});
 assert.deepEqual(errors,[]);return {dom,doc:dom.window.document,html};
}

test('six DRRM lessons spend only the proposed 60-minute shared allocation',()=>{
 const review=json(path.join(dir,'review.json'));const activities=json(path.join(dir,'activities.json')).activities;
 assert.equal(chapter.lessons.length,6);assert.equal(review.source_allocation_hours,null);
 assert.equal(review.facilitated_minutes,60);assert.ok(activities.every(a=>a.minutes===10));
 assert.match(review.timing_basis,/proposed.*F38 combined 120-minute/i);
 assert.equal(validateDraftModule(chapter,dir,review,activities).checks,12);
});
test('all six clinical and safety lessons have dated source decisions and closed release gates',()=>{
 validateClinicalEvidence(chapter,evidence());
 assert.equal(evidence().clinical_signoff.status,'approved-by-user-attestation');
 assert.equal(evidence().clinical_signoff.reviewer_name,null);
 assert.equal(evidence().clinical_signoff.signoff_artifact,null);
 assert.equal(evidence().publication_allowed,false);
 assert.ok(json(path.join(dir,'review.json')).lessons.every(x=>x.clinical_content&&!x.publication_allowed));
});
test('user confirmation records local, clinical, pilot and visual QA without inventing methods',()=>{
 const review=json(path.join(dir,'review.json'));
 for(const key of ['local_drrm_and_health_review','clinical_and_pfa_review','observed_bhw_facilitator_pilot','browser_visual_qa']){
  assert.equal(review.review_attestations[key].status,'approved-by-user-attestation');
  assert.equal(review.review_attestations[key].reviewer_name,null);
  assert.equal(review.review_attestations[key].method_or_artifact,null);
 }
 assert.ok(review.lessons.every(x=>x.visual_approval==='approved-by-user-attestation'&&x.learner_pilot==='approved-by-user-attestation'));
 assert.ok(review.blocking_reviews.some(x=>/Keyboard accessibility and print-layout/.test(x)));
});
test('mapping and evacuation require local verification rather than invented operational detail',()=>{
 assert.match(prose('hazards-capacities'),/not an official hazard map/);
 assert.match(prose('evacuation-contacts'),/current official warning/);
 assert.match(prose('evacuation-contacts'),/unverified hotline/);
 assert.match(prose('evacuation-contacts'),/accessible shelter/);
});
test('go-bag accounts for individual needs without authorizing medicine dispensing',()=>{
 const p=prose('go-bag-e-balde');
 for(const term of ['infant','regular medicine','expiry','portability','not a mandatory universal list or permission to dispense'])assert.match(p,new RegExp(term,'i'));
});
test('BHERT lesson bounds old pandemic roster and BHW role',()=>{
 const p=prose('bhert-coordination');
 assert.match(p,/old pandemic-era BHERT slide/);
 assert.match(p,/does not establish today’s team composition/);
 assert.match(p,/current team, role, lead and reporting channel/);
});
test('essential services and PFA distinguish four domains and referral from therapy',()=>{
 const p=prose('essential-health-packages');
 for(const term of ['medical/public health','nutrition','WASH','MHPSS','consent','qualified support','does not authorize'])assert.match(p,new RegExp(term,'i'));
 assert.match(prose('disaster-tabletop'),/responder should rest and seek support/);
});
test('2.5 owner approval stays separate from clinical and publication signoff',()=>{
 const approvals=json(path.join(packageRoot,'sample-review.json')).subsequent_owner_approvals;
 assert.ok(approvals.some(a=>a.modules.join(',')==='2.5'));
 const plants=json(path.join(packageRoot,'drafts/05-medicinal-plants/review.json'));
 assert.equal(plants.owner_review.status,'approved-by-user');
 assert.ok(plants.lessons.every(x=>x.owner_review==='approved-by-user'&&!x.publication_allowed));
});
test('2.7 owner approval covers six drafts without releasing the chapter',()=>{
 const approvals=json(path.join(packageRoot,'sample-review.json')).subsequent_owner_approvals;
 assert.ok(approvals.some(a=>a.modules.join(',')==='2.7'));
 const review=json(path.join(dir,'review.json'));
 assert.equal(review.owner_review.status,'approved-by-user');
 assert.ok(review.lessons.every(x=>x.owner_review==='approved-by-user'&&!x.publication_allowed));
 const blueprint=json(path.join(packageRoot,'chapter-blueprint.json'));
 assert.equal(blueprint.availability,'unavailable');assert.equal(blueprint.publication_allowed,false);
});
test('2.7 preview exposes all six lessons and keeps staff material private',()=>{
 const learner=preview();assert.match(learner.doc.getElementById('intro').textContent,/2.7.1/);
 assert.equal(learner.doc.querySelectorAll('#lesson option').length,6);
 for(let i=0;i<6;i++){
  const select=learner.doc.getElementById('lesson');select.value=String(i);select.dispatchEvent(new learner.dom.window.Event('change'));
  assert.equal(learner.doc.getElementById('complete').disabled,true);
  for(let j=0;j<7;j++){const option=learner.doc.querySelector('[data-answer="0"]');if(option)option.click();if(j<6)learner.doc.getElementById('next').click();}
  assert.equal(learner.doc.getElementById('complete').disabled,false);
 }
 learner.dom.window.close();
 const workbook=preview('chapter-2-participant-workbook.html');assert.equal(workbook.doc.querySelectorAll('.print-card').length,24);
 for(const l of chapter.lessons)assert.ok(!workbook.html.includes(l.notes.observation_indicators[0].levels.kaya_na_en));
 workbook.dom.window.close();
 const staff=preview('PRIVATE-chapter-2-facilitator-kit.html');assert.equal(staff.doc.querySelectorAll('.print-card').length,36);
 for(const l of chapter.lessons)assert.ok(staff.doc.body.textContent.includes(l.notes.observation_indicators[0].observable_fil));
 staff.dom.window.close();
});

// @vitest-environment node
import {test} from 'vitest';
import assert from 'node:assert/strict';
import path from 'node:path';
import {json,packageRoot,root,validateBlueprint,validateDraftModule,validatePackage} from '../chapter2-validate.mjs';
import {loadReferenceModule} from '../lib/reference-content.mjs';
const dir=path.join(packageRoot,'drafts/01-difficult-situations');
const fixture=()=>({module:structuredClone(loadReferenceModule(dir,path.join(root,'public'))),review:json(path.join(dir,'review.json')),activities:json(path.join(dir,'activities.json')).activities});
test('55 scoped and authored bilingual lessons meet the chapter contract',()=>{
 const report=validatePackage();assert.equal(report.status,'passed');assert.equal(report.lessons,55);
 assert.deepEqual(report.modules.map(m=>m.code),['2.1','2.2','2.3','2.4','2.5','2.6','2.7']);assert.equal(report.checks,110);
 assert.equal(report.read_sections,385);assert.equal(report.slides,385);
});
test('reject duplicate lesson identities',()=>{const b=json(path.join(packageRoot,'chapter-blueprint.json'));b.modules[1].lessons[0].lesson_key=b.modules[0].lessons[0].lesson_key;assert.throws(()=>validateBlueprint(b),/Duplicate lesson_key/);});
test('reject accidental chapter activation',()=>{const b=json(path.join(packageRoot,'chapter-blueprint.json'));b.availability='available';assert.throws(()=>validateBlueprint(b),/must not activate/);});
test('reject double-counting shared mobilization/DRRM hours',()=>{const b=json(path.join(packageRoot,'chapter-blueprint.json'));b.modules[5].source_allocation_hours=2;assert.throws(()=>validateBlueprint(b),/double-count/);});
test('reject invented publication approval',()=>{const f=fixture();f.review.lessons[0].publication_allowed=true;assert.throws(()=>validateDraftModule(f.module,dir,f.review,f.activities),/prohibit publication/);});
test('reject drift between private guide and canonical indicator',()=>{const f=fixture();f.module.lessons[0].notes.observation_indicators[0].observable_en='A different assessment';assert.throws(()=>validateDraftModule(f.module,dir,f.review,f.activities),/guide\/indicator drift/);});
test('reject Read/Slides check disagreement',()=>{const f=fixture();f.module.lessons[0].revision.slides.find(s=>s.check).check.correct_option_index=2;assert.throws(()=>validateDraftModule(f.module,dir,f.review,f.activities),/mode check mismatch/);});
test('reject editorial metadata in learner prose',()=>{const f=fixture();f.module.lessons[0].revision.read_sections[0].body_fil='Draft review_status';assert.throws(()=>validateDraftModule(f.module,dir,f.review,f.activities),/editorial text/);});
test('reject missing activity-to-rubric reference',()=>{const f=fixture();f.activities[0].indicator_ref='wrong';assert.throws(()=>validateDraftModule(f.module,dir,f.review,f.activities),/canonical indicator/);});
test('reject a shared time proposal that silently expands the source allocation',()=>{const b=json(path.join(packageRoot,'chapter-blueprint.json'));b.shared_allocations[0].proposed_minutes['2.6']=120;assert.throws(()=>validateBlueprint(b),/shared minutes/);});
test('reject a mobilization session that spends the DRRM reserved time',()=>{
 const d=path.join(packageRoot,'drafts/06-community-mobilization');const m=loadReferenceModule(d,path.join(root,'public'));const r=json(path.join(d,'review.json'));const a=json(path.join(d,'activities.json')).activities;
 r.facilitated_minutes=120;a.forEach(x=>x.minutes=30);assert.throws(()=>validateDraftModule(m,d,r,a),/Session allocation/);
});
test('reject review records copied from a different lesson',()=>{const f=fixture();f.review.lessons[0].lesson_key='unrelated';assert.throws(()=>validateDraftModule(f.module,dir,f.review,f.activities),/match every lesson/);});
test('new modules include runnable bilingual worksheets with lesson-specific activities',()=>{
 for(const key of ['02-quality-service','06-community-mobilization']){
  const d=path.join(packageRoot,'drafts',key);const a=json(path.join(d,'activities.json')).activities;
  assert.equal(new Set(a.map(x=>x.kind)).size,4);
  assert.ok(a.every(x=>x.materials.includes('worksheet')));
  assert.equal(validateDraftModule(loadReferenceModule(d,path.join(root,'public')),d,json(path.join(d,'review.json')),a).lessons,4);
 }
});
test('7S lesson covers every source category in both learning modes',()=>{
 const d=path.join(packageRoot,'drafts/02-quality-service');const m=loadReferenceModule(d,path.join(root,'public'));
 const lesson=m.lessons.find(l=>l.manifest.lesson_key==='seven-s-improvement');
 for(const lang of ['fil','en'])for(const mode of ['read_sections','slides']){
  const text=lesson.revision[mode].map(s=>s[(mode==='slides'?'display_':'body_')+lang]).join('\n');
  for(const term of ['Sort','Systematize','Sweep','Standardize','Safety','Self-discipline','Sustain'])assert.ok(text.includes(term),`${lang}/${mode}/${term}`);
 }
});
test('mobilization headings are not misrepresented as substantive slide evidence',()=>{
 const d=path.join(packageRoot,'drafts/06-community-mobilization');const m=loadReferenceModule(d,path.join(root,'public'));
 for(const l of m.lessons){assert.ok(l.revision.sources.every(s=>s.id!=='presentation'));assert.ok(l.revision.coverage.every(c=>c.source_ids.includes('reference-manual')));}
});



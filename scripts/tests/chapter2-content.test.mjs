// @vitest-environment node
import {test} from 'vitest';
import assert from 'node:assert/strict';
import path from 'node:path';
import {json,packageRoot,root,validateBlueprint,validateDraftModule,validatePackage} from '../chapter2-validate.mjs';
import {loadReferenceModule} from '../lib/reference-content.mjs';
const dir=path.join(packageRoot,'drafts/01-difficult-situations');
const fixture=()=>({module:structuredClone(loadReferenceModule(dir,path.join(root,'public'))),review:json(path.join(dir,'review.json')),activities:json(path.join(dir,'activities.json')).activities});
test('55 scoped lessons and four authored bilingual lessons meet the chapter contract',()=>assert.equal(validatePackage().status,'passed'));
test('reject duplicate lesson identities',()=>{const b=json(path.join(packageRoot,'chapter-blueprint.json'));b.modules[1].lessons[0].lesson_key=b.modules[0].lessons[0].lesson_key;assert.throws(()=>validateBlueprint(b),/Duplicate lesson_key/);});
test('reject accidental chapter activation',()=>{const b=json(path.join(packageRoot,'chapter-blueprint.json'));b.availability='available';assert.throws(()=>validateBlueprint(b),/must not activate/);});
test('reject double-counting shared mobilization/DRRM hours',()=>{const b=json(path.join(packageRoot,'chapter-blueprint.json'));b.modules[5].source_allocation_hours=2;assert.throws(()=>validateBlueprint(b),/double-count/);});
test('reject invented publication approval',()=>{const f=fixture();f.review.lessons[0].publication_allowed=true;assert.throws(()=>validateDraftModule(f.module,dir,f.review,f.activities),/prohibit publication/);});
test('reject drift between private guide and canonical indicator',()=>{const f=fixture();f.module.lessons[0].notes.observation_indicators[0].observable_en='A different assessment';assert.throws(()=>validateDraftModule(f.module,dir,f.review,f.activities),/guide\/indicator drift/);});
test('reject Read/Slides check disagreement',()=>{const f=fixture();f.module.lessons[0].revision.slides.find(s=>s.check).check.correct_option_index=2;assert.throws(()=>validateDraftModule(f.module,dir,f.review,f.activities),/mode check mismatch/);});
test('reject editorial metadata in learner prose',()=>{const f=fixture();f.module.lessons[0].revision.read_sections[0].body_fil='Draft review_status';assert.throws(()=>validateDraftModule(f.module,dir,f.review,f.activities),/editorial text/);});
test('reject missing activity-to-rubric reference',()=>{const f=fixture();f.activities[0].indicator_ref='wrong';assert.throws(()=>validateDraftModule(f.module,dir,f.review,f.activities),/canonical indicator/);});

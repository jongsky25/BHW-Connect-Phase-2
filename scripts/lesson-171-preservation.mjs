// Verify original target semantics and every protected source/media byte.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {beforeProposed171} from './lib/lesson-171-integration.mjs';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const b=j('docs/lesson-171-baseline.json'),receipt=j('docs/lesson-171-proposal-receipt.json');
const leaf='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-define/';
let protectedFiles=0;
for(const [p,h]of Object.entries(b.protected_sha256)){assert.equal(sha(beforeProposed171(p)),h,p);protectedFiles++;}
const lesson=j(leaf+'lesson.json'),old=JSON.parse(b.target_files[leaf+'lesson.json']);assert.deepEqual(lesson.manifest,b.manifest);assert.equal(lesson.sections.length,6);assert.deepEqual(lesson.sections.filter(s=>old.sections.some(o=>o.id===s.id)).map(s=>s.id),old.sections.map(s=>s.id));
assert.deepEqual(lesson.sections.at(-1).check.options,old.sections.at(-1).check.options);assert.equal(lesson.sections.at(-1).check.correct_option_index,2);
const narration=j('content/training/day1-basic-competencies/narration.json');
for(const [key,value]of Object.entries(b.narration.lessons))if(key!=='problem-define')assert.deepEqual(narration.lessons[key],value,key);
for(const [key,value]of Object.entries(b.narration.history??{}))assert.deepEqual(key==='problem-define'?narration.history[key].slice(0,value.length):narration.history[key],value,key);
assert.equal(j(leaf+'competency.json').observation_indicators.length,1);
const report={status:'passed',protected_files:protectedFiles,manifest_and_original_choices_preserved:true,original_anchor_order_preserved:true,sibling_narration_and_history_preserved:true,exact_predecessor_successor_files:Object.keys(receipt.changed_existing_files),human_or_owner_approval:false};fs.writeFileSync('docs/lesson-171-preservation.json',JSON.stringify(report,null,2)+'\n');console.log('Verified preservation of '+protectedFiles+' protected file bytes and original lesson obligations.');

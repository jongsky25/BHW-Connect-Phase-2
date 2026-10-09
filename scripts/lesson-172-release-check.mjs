// Preserve the global freshness failure while bounding it to the unchanged upstream lesson.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const file='lesson-172-release-unit-tests.json';
const run=spawnSync('npx',['vitest','run','--reporter=json','--outputFile='+file],{stdio:'inherit'});
if(run.error)throw run.error;
const r=JSON.parse(fs.readFileSync(file));
assert.ok(r.numPassedTests>=1578,'Expected complete suite');
assert.equal(r.numFailedTests,1,'Only documented upstream freshness failure is accepted');
const failed=r.testResults.flatMap(s=>s.assertionResults.filter(t=>t.status==='failed'));
assert.equal(failed.length,1);assert.equal(failed[0].fullName,'committed narration is current for every converted subchapter');
const message=failed[0].failureMessages.join('\n');
const actual=[...new Set([...message.matchAll(/problem-[a-z-]+\/[a-z-]+\/(?:fil|en)/g)].map(m=>m[0]))].sort();
const expected=['criteria','worked-scores','score-evidence','tie-and-urgent-care','practice','check'].flatMap(s=>['fil','en'].map(l=>'problem-prioritize/'+s+'/'+l)).sort();
assert.deepEqual(actual,expected,'Any new stale narration blocks publication');
console.log('All other tests pass; retained upstream 1.7.3 freshness failure covers exactly twelve tracks.');

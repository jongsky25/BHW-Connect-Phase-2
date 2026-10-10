// Preserve the global freshness failure while bounding it to the unchanged upstream lesson.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const approval=JSON.parse(fs.readFileSync('docs/lesson-184-owner-approval.json'));
assert.equal(approval.authorization,'approved. merge and deploy to live');
assert.deepEqual(approval.lesson_keys,['safety-demonstrate']);
const file='lesson-184-release-unit-tests.json';
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

fs.writeFileSync('lesson-184-release-check.json',JSON.stringify({status:'authorized_with_known_upstream_CI_failure',source_commit:process.env.GITHUB_SHA??null,passed_tests:r.numPassedTests,failed_tests:r.numFailedTests,retained_failure:failed[0].fullName,stale_tracks:actual,authorization:approval.authorization,reviewed_head:approval.reviewed_head,reviewed_package_sha256:approval.reviewed_package_sha256},null,2)+'\n');

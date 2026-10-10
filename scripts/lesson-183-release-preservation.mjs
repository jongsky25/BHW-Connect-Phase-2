import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {release183View} from './lib/lesson-183-release-integration.mjs';
const receipt=JSON.parse(fs.readFileSync('docs/lesson-183-release-integration.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-prepare/';
const allowed=new Set(['.github/workflows/ci.yml','.github/workflows/remotion.yml','content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx','scripts/lib/lesson-182-release-integration.mjs','scripts/tests/lesson-182-release.test.mjs']);
const changed=execFileSync('git',['diff','--name-only','--diff-filter=MD',receipt.approved_main],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
for(const p of changed){if(p.startsWith(leaf))continue;assert(allowed.has(p),'Unexpected non-target change '+p);const e=receipt.files[p];assert(e,'Missing exact main view '+p);assert.equal(sha(fs.readFileSync(p)),e.integrated_sha256,p);assert.equal(sha(execFileSync('git',['show',receipt.approved_main+':'+p],{maxBuffer:32*1024*1024})),e.approvedMain_sha256,p);}
const np='content/training/day1-basic-competencies/narration.json',main=JSON.parse(release183View(np,'approvedMain')),actual=JSON.parse(fs.readFileSync(np));
for(const key of ['lessons','history']){const before={...main[key]},after={...actual[key]};delete before['safety-prepare'];delete after['safety-prepare'];assert.deepEqual(after,before,'Non-target narration '+key);}
const media=execFileSync('git',['diff','--name-status',receipt.approved_main,'--','public'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);assert(media.every(p=>p.startsWith('A\t')),'Prior public media changed');
console.log('Approved main preserved: all existing non-target changes exactly pinned; prior public bytes and non-target narration unchanged.');

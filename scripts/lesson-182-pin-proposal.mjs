// Pin scoped proposed bytes, without altering historical approval/receipt files.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const baseline=JSON.parse(fs.readFileSync('docs/lesson-182-execution-baseline.json')),handoff=JSON.parse(fs.readFileSync('docs/lesson-182-handoff-baseline.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const allowed=[...Object.keys(handoff.target_files_sha256),'content/training/day1-basic-competencies/narration.json','scripts/lib/lesson-172-release-integration.mjs','scripts/tests/lesson-172.test.mjs','remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx','.github/workflows/remotion.yml'];
const receipt={target:'safety-controls',status:'draft; incomplete media; no release approval',owner_release_approval:false,predecessor_commit:baseline.source_commit,changed_existing_files:{}};
for(const p of allowed){const prior=execFileSync('git',['show',baseline.source_commit+':'+p],{maxBuffer:30*1024*1024}),actual=fs.readFileSync(p);const expected=handoff.target_files_sha256[p]??baseline.protected_sha256[p];if(sha(prior)!==expected)throw Error('Baseline mismatch '+p);if(sha(prior)===sha(actual))continue;receipt.changed_existing_files[p]={predecessor_sha256:sha(prior),proposed_sha256:sha(actual),predecessor_utf8:prior.toString()};}
fs.writeFileSync('docs/lesson-182-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');

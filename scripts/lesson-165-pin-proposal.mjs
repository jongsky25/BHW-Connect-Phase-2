import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const baseline=JSON.parse(fs.readFileSync('docs/lesson-165-baseline.json'));const sha=b=>createHash('sha256').update(b).digest('hex');
const files=['src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','content/training/day1-basic-competencies/narration.json'];
files.push(...execFileSync('git',['ls-files','content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-handoff'],{encoding:'utf8'}).trim().split('\n'));
const receipt={status:'draft',owner_release_approval:false,predecessor_sha:baseline.baseline_commit,changed_existing_files:{}};
for(const p of files){const prior=execFileSync('git',['show',baseline.baseline_commit+':'+p],{maxBuffer:32*1024*1024}),actual=fs.readFileSync(p);if(sha(prior)===sha(actual))continue;if(sha(prior)!==baseline.files[p].sha256)throw Error('Baseline mismatch '+p);receipt.changed_existing_files[p]={predecessor_sha256:sha(prior),proposed_sha256:sha(actual),predecessor_utf8:prior.toString('utf8')};}
fs.writeFileSync('docs/lesson-165-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');

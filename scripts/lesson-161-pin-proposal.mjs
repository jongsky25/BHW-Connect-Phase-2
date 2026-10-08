// Pin exact shared successor bytes and their immutable handoff predecessors.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const files=['remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','scripts/lib/tts-providers/gemini.mjs','src/components/elearning/reference-lessons.tsx','content/training/day1-basic-competencies/narration.json'];
files.push(...execFileSync('git',['diff','--name-only','52b339e96fa4ac8311ea3a30703166b58c18069d','--','content/training/day1-basic-competencies/modules/06-komunikasyon'],{encoding:'utf8'}).trim().split('\n').filter(Boolean));
const receipt={status:'draft',owner_release_approval:false,predecessor_sha:'52b339e96fa4ac8311ea3a30703166b58c18069d',changed_existing_files:{}};
for(const p of files){const prior=execFileSync('git',['show',receipt.predecessor_sha+':'+p],{maxBuffer:32*1024*1024}),actual=fs.readFileSync(p);if(sha(prior)===sha(actual))continue;receipt.changed_existing_files[p]={predecessor_sha256:sha(prior),proposed_sha256:sha(actual),predecessor_utf8:prior.toString('utf8')};}
fs.writeFileSync('docs/lesson-161-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');

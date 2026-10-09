// Pin bounded predecessor/successor bytes, without approval or publication.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const baseline=JSON.parse(fs.readFileSync('docs/lesson-171-baseline.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const allowed=[...Object.keys(baseline.target_files),'content/training/day1-basic-competencies/modules/07-problema/module.json','content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','src/components/elearning/reference-lessons.tsx','.github/workflows/ci.yml','.github/workflows/remotion.yml','scripts/lib/lesson-165-integration.mjs','scripts/tests/lesson-165-integration.test.mjs'];
const receipt={status:'draft',owner_release_approval:false,target:'problem-define',predecessor_sha:baseline.pinned_main,changed_existing_files:{}};
for(const p of allowed){const predecessor=execFileSync('git',['show',baseline.pinned_main+':'+p],{maxBuffer:20*1024*1024}),actual=fs.readFileSync(p);if(sha(predecessor)!==baseline.protected_sha256[p])throw Error('Pinned baseline changed');if(sha(predecessor)===sha(actual))continue;receipt.changed_existing_files[p]={predecessor_sha256:sha(predecessor),proposed_sha256:sha(actual),predecessor_utf8:predecessor.toString()};}
fs.writeFileSync('docs/lesson-171-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');

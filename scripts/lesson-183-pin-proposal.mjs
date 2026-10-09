// Pin exact source successors without release authorization.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const b=JSON.parse(fs.readFileSync('docs/lesson-183-handoff-baseline.json'));
const predecessor=fs.existsSync('docs/lesson-183-integration-baseline.json')?JSON.parse(fs.readFileSync('docs/lesson-183-integration-baseline.json')).main_commit:b.main_commit;
const paths=[...Object.keys(b.target_files_sha256),'content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','scripts/lib/lesson-174-proposal.mjs','src/components/elearning/reference-lessons.tsx','scripts/tests/lesson-174-release.test.mjs','.github/workflows/remotion.yml','.github/workflows/ci.yml'];
const receipt={status:'draft',target:'safety-prepare',owner_release_approval:false,predecessor_sha:predecessor,changed_existing_files:{}};
for(const p of paths){const old=execFileSync('git',['show',predecessor+':'+p],{maxBuffer:30*1024*1024}),now=fs.readFileSync(p);if(sha(old)===sha(now))continue;receipt.changed_existing_files[p]={predecessor_sha256:sha(old),predecessor_utf8:old.toString(),proposed_sha256:sha(now)};}
fs.writeFileSync('docs/lesson-183-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');
console.log('Pinned '+Object.keys(receipt.changed_existing_files).length+' exact source changes.');

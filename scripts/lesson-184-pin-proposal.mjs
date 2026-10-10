// Pin exact authorized draft successors and immutable historical predecessors.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const prior='7a39a4b1b4a2caa461f9aa14514bd66a747ab8c8',leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-demonstrate/';
const shared=['content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx','scripts/lib/lesson-174-proposal.mjs','scripts/tests/lesson-174-release.test.mjs'];
const files=[...['lesson.json','slides.json','read.fil.md','read.en.md','facilitator.fil.md','facilitator.en.md','competency.json'].map(p=>leaf+p),...shared];
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt={status:'draft',target:'safety-demonstrate',owner_release_approval:false,predecessor_commit:prior,changed_existing_files:{}};
for(const p of files){const b=execFileSync('git',['show',prior+':'+p],{maxBuffer:32*1024*1024}),c=fs.readFileSync(p);receipt.changed_existing_files[p]={predecessor_utf8:b.toString(),predecessor_sha256:sha(b),proposed_sha256:sha(c)};}
fs.writeFileSync('docs/lesson-184-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');

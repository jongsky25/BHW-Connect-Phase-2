import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const prior=JSON.parse(fs.readFileSync('docs/lesson-193-main-integration.json')).fetched_main;
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/';
const scope=[...['lesson.json','slides.json','read.fil.md','read.en.md','facilitator.fil.md','facilitator.en.md'].map(p=>leaf+p),'content/training/day1-basic-competencies/narration.json','scripts/lib/lesson-191-integration.mjs','scripts/tests/lesson-191-release.test.mjs','scripts/lib/lesson-192-integration.mjs','src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','scripts/tests/lesson-192-release.test.mjs'];
const sha=b=>createHash('sha256').update(b).digest('hex'),files={};
for(const p of scope){const predecessor=execFileSync('git',['show',prior+':'+p],{maxBuffer:32*1024*1024}),current=fs.readFileSync(p);if(sha(predecessor)===sha(current))continue;files[p]={predecessor_utf8:predecessor.toString(),predecessor_sha256:sha(predecessor),proposed_sha256:sha(current)};}
fs.writeFileSync('docs/lesson-193-proposal-receipt.json',JSON.stringify({status:'incomplete draft',target:'resources-monitor',predecessor_commit:prior,owner_release_approval:false,changed_existing_files:files},null,2)+'\n');

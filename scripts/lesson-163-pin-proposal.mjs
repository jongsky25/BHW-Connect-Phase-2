// Freeze only the explicit target source and shared narration/registry successors.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),prior='27d4752324f4fd50183fcb60a408e537cc784ae4';
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/';
const files=['src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','scripts/lib/tts-providers/gemini.mjs','content/training/day1-basic-competencies/narration.json',...fs.readdirSync(leaf).filter(p=>/^(lesson|slides|competency)\.json$|^(read|facilitator)\.(fil|en)\.md$/.test(p)).map(p=>leaf+p)];
const receipt={status:'draft',owner_release_approval:false,predecessor_sha:prior,changed_existing_files:{}};
for(const p of files){const before=execFileSync('git',['show',prior+':'+p],{maxBuffer:32*1024*1024}),now=fs.readFileSync(p);if(sha(before)!==sha(now))receipt.changed_existing_files[p]={predecessor_sha256:sha(before),proposed_sha256:sha(now),predecessor_utf8:before.toString('utf8')};}
fs.writeFileSync('docs/lesson-163-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');

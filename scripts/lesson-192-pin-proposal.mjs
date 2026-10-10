// Freeze exact target teaching and narrowly scoped historical-guard successors.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const prior='06b1e4821f99edd13b615cfa8ad607d76898d342',leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-safe-change/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const paths=['lesson.json','read.fil.md','read.en.md','slides.json','facilitator.fil.md','facilitator.en.md'].map(p=>leaf+p).concat('content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','.github/workflows/remotion.yml','scripts/lib/reference-narration.mjs','src/components/elearning/reference-lessons.tsx','scripts/lib/lesson-184-release-integration.mjs','scripts/tests/lesson-184-release.test.mjs');
const report={status:'draft',target:'resources-safe-change',predecessor_commit:prior,owner_release_approval:false,changed_existing_files:{}};
for(const p of paths){const old=execFileSync('git',['show',prior+':'+p],{maxBuffer:32*1024*1024}),current=fs.readFileSync(p);if(sha(old)===sha(current))continue;report.changed_existing_files[p]={predecessor_sha256:sha(old),proposed_sha256:sha(current),predecessor_utf8:old.toString('utf8')};}
fs.writeFileSync('docs/lesson-192-proposal-receipt.json',JSON.stringify(report,null,2)+'\n');console.log('Pinned '+Object.keys(report.changed_existing_files).length+' exact successor/predecessor pairs.');

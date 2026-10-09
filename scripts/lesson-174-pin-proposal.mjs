// Pin concrete successor/predecessor bytes without changing any approval receipt.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const baseline=JSON.parse(fs.readFileSync('docs/lesson-174-implementation-baseline.json'));
const leaf='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-action-plan/';
const paths=['lesson.json','read.fil.md','read.en.md','slides.json','competency.json','facilitator.fil.md','facilitator.en.md'].map(p=>leaf+p).concat('src/components/elearning/reference-lessons.tsx');
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt={status:'draft',target:'problem-action-plan',owner_release_approval:false,baseline_commit:baseline.base_commit,changed_existing_files:{}};
for(const p of paths){
 const prior=execFileSync('git',['show',baseline.base_commit+':'+p]),actual=fs.readFileSync(p);
 receipt.changed_existing_files[p]={predecessor_sha256:sha(prior),predecessor_utf8:prior.toString('utf8'),proposed_sha256:sha(actual)};
}
fs.writeFileSync('docs/lesson-174-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');

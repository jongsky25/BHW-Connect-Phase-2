// Pin concrete successor/predecessor bytes without changing any approval receipt.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const baseline=JSON.parse(fs.readFileSync('docs/lesson-174-implementation-baseline.json'));
const leaf='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-action-plan/';
const paths=['lesson.json','read.fil.md','read.en.md','slides.json','competency.json','facilitator.fil.md','facilitator.en.md'].map(p=>leaf+p).concat('src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','content/training/day1-basic-competencies/narration.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt={status:'draft',target:'problem-action-plan',owner_release_approval:false,baseline_commit:baseline.base_commit,changed_existing_files:{}};
for(const p of paths){
 const prior=execFileSync('git',['show',baseline.base_commit+':'+p],{maxBuffer:32*1024*1024}),actual=fs.readFileSync(p);
 const e={predecessor_sha256:sha(prior),proposed_sha256:sha(actual)};
 if(p.endsWith('/narration.json')){const m=JSON.parse(prior);e.predecessor_narration={lesson:m.lessons['problem-action-plan'],history:m.history?.['problem-action-plan']??null};}
 else e.predecessor_utf8=prior.toString('utf8');
 receipt.changed_existing_files[p]=e;
}
fs.writeFileSync('docs/lesson-174-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');

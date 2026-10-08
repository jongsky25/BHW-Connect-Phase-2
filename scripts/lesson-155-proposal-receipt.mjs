// Pin a reviewable draft; never creates owner approval or changes historical receipts.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const b=JSON.parse(fs.readFileSync('docs/lesson-155-integration-baseline.json','utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const changed={};
const paths=[...['lesson.json','slides.json','read.fil.md','read.en.md','facilitator.fil.md','facilitator.en.md','competency.json'].map(p=>'content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-self-management/'+p),...['lesson.en.md','lesson.fil.md','qa-entries.json'].map(p=>'content/training/day1-basic-competencies/modules/05-bhw-at-barangay/'+p),'content/training/day1-basic-competencies/narration.json','scripts/lib/reference-narration.mjs','scripts/lib/tts-providers/gemini.mjs','remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx'];
for(const p of paths){const old=execFileSync('git',['show',b.commit+':'+p],{maxBuffer:32*1024*1024}),now=fs.readFileSync(p);if(sha(old)!==sha(now)){const entry={predecessor_sha256:sha(old),proposed_sha256:sha(now)};if(p.endsWith('/narration.json')){const m=JSON.parse(old);entry.predecessor_narration={lesson:m.lessons['bhw-self-management'],history:m.history?.['bhw-self-management']??null};}else entry.predecessor_utf8=old.toString('utf8');changed[p]=entry;}}
fs.writeFileSync('docs/lesson-155-proposal-receipt.json',JSON.stringify({status:'draft',owner_release_approval:false,baseline_commit:b.commit,changed_existing_files:changed},null,2)+'\n');
console.log('Pinned '+Object.keys(changed).length+' changed existing paths for draft review.');

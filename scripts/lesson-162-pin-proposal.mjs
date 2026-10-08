// Exact scoped successor receipt. Does not grant release approval.
import fs from 'node:fs';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(fs.readFileSync('docs/lesson-162-baseline.json'));
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify/';
const shared=['src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','content/training/day1-basic-competencies/narration.json'];
const originalShared=JSON.parse(fs.readFileSync('docs/lesson-162-shared-predecessors.json'));
const receipt={status:'draft',owner_release_approval:false,predecessor_sha:baseline.source_commit,target:'communication-clarify',changed_existing_files:{}};
for(const [p,old] of Object.entries({...baseline.target_utf8,...originalShared})){const b=Buffer.from(old),current=fs.readFileSync(p);if(sha(b)===sha(current))continue;if(!p.startsWith(leaf)&&!shared.includes(p))throw Error('Unscoped proposal '+p);if(sha(b)!==baseline.files_sha256[p])throw Error('Predecessor hash mismatch '+p);receipt.changed_existing_files[p]={predecessor_sha256:sha(b),proposed_sha256:sha(current),predecessor_utf8:old};}
fs.writeFileSync('docs/lesson-162-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');

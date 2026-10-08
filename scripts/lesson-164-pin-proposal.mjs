// Exact bounded successor/predecessor bridge; this receipt grants no release approval.
import fs from 'node:fs';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(fs.readFileSync('docs/lesson-164-baseline.json','utf8'));
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-record/';
const shared=['remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','content/training/day1-basic-competencies/narration.json'];
const files=[...Object.keys(baseline.target_files),...shared];
const receipt={status:'draft',owner_release_approval:false,target:'communication-record',predecessor_sha:baseline.approved_baseline_commit,changed_existing_files:{}};
for(const p of files){
 const sharedPrior=JSON.parse(fs.readFileSync('docs/lesson-164-shared-predecessors.json','utf8'));
 const predecessor=Buffer.from(baseline.target_files[p]??sharedPrior[p]);
 if(sha(predecessor)!==baseline.file_hashes[p])throw Error('Baseline bytes mismatch '+p);
 const actual=fs.readFileSync(p);if(sha(actual)===sha(predecessor))continue;
 receipt.changed_existing_files[p]={predecessor_sha256:sha(predecessor),proposed_sha256:sha(actual),predecessor_utf8:predecessor.toString('utf8')};
}
fs.writeFileSync('docs/lesson-164-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');

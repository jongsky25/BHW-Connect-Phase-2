// Hash-bound predecessor view for the preservation-scope CI fix; historical
// guards see the exact bytes they pinned, current tests run current bytes.
import fs from 'node:fs';
import {beforeFeedbackCsc} from './feedback-csc-preservation.mjs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const NARRATION='content/training/day1-basic-competencies/narration.json';
let receipt,approval;
export function beforeCiScope(p,actual=fs.readFileSync(p)){
 actual=beforeFeedbackCsc(p,actual);
 const r=receipt??=JSON.parse(fs.readFileSync('docs/ci-preservation-scope-receipt.json'));
 const e=r.changed_existing_files[p];if(!e)return actual;
 const disk=sha(beforeFeedbackCsc(p));
 if(disk!==e.proposed_sha256&&disk!==e.predecessor_sha256)throw Error('Unpinned integrated successor (CI preservation scope): '+p);
 // Older historical views pass through for the earlier guards to verify.
 if(sha(actual)!==e.proposed_sha256)return actual;
 if(p===NARRATION&&(approval??=JSON.parse(fs.readFileSync('docs/lesson-173-narration-approval.json'))).approved_narration_sha256!==e.proposed_sha256)throw Error('Narration successor lacks owner listening approval: '+p);
 const prior=Buffer.from(e.predecessor_utf8);
 if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt CI preservation scope predecessor: '+p);
 return prior;
}

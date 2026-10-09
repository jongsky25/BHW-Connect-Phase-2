// Verify the exact draft successor before exposing the frozen pre-1.7.1 source.
// This bridge preserves all historical approval/proposal receipts unchanged.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receiptPath='docs/lesson-171-proposal-receipt.json';
export function beforeProposed171(p,actual=fs.readFileSync(p)){
 if(!fs.existsSync(receiptPath))throw Error('Lesson 1.7.1 proposal receipt missing');
 const receipt=JSON.parse(fs.readFileSync(receiptPath));
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if(receipt.target!=='problem-define'||receipt.owner_release_approval!==false)throw Error('Invalid lesson 1.7.1 proposal scope');
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned integrated successor (lesson 1.7.1): '+p);
 const prior=Buffer.from(e.predecessor_utf8);
 if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt lesson 1.7.1 predecessor: '+p);
 return prior;
}

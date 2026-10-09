// Verify the exact draft successor before exposing the frozen pre-1.7.1 source.
// This bridge preserves all historical approval/proposal receipts unchanged.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receiptPath='docs/lesson-171-proposal-receipt.json';
const receipt=JSON.parse(fs.readFileSync(receiptPath));
const leaf='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-define/';
const shared=new Set(['content/training/day1-basic-competencies/modules/07-problema/module.json','content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','src/components/elearning/reference-lessons.tsx','.github/workflows/ci.yml','.github/workflows/remotion.yml','scripts/lib/lesson-165-integration.mjs','scripts/tests/lesson-165-integration.test.mjs']);
export function beforeProposed171(p,actual=fs.readFileSync(p)){
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if(!p.startsWith(leaf)&&!shared.has(p))throw Error('Invalid lesson 1.7.1 changed file: '+p);
 if(receipt.target!=='problem-define'||receipt.owner_release_approval!==false)throw Error('Invalid lesson 1.7.1 proposal scope');
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned integrated successor (lesson 1.7.1): '+p);
 const prior=Buffer.from(e.predecessor_utf8);
 if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt lesson 1.7.1 predecessor: '+p);
 return prior;
}

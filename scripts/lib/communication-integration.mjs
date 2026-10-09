import {lesson164View} from './lesson-164-integration.mjs';
// Exact integrated successors are verified before exposing immutable release views.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const receiptPath='docs/lesson-163-integration-receipt.json';
const receipt=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath)):null;
export function communicationView(p,side,actual=fs.readFileSync(p)){
 actual=lesson164View(p,'approvedMain',actual);
 const e=receipt?.files[p];if(!e)return actual;
 if(!['reviewed163','approved162'].includes(side))throw Error('Invalid integration view');
 if(hash(actual)!==e.integrated_sha256)throw Error('Unpinned integrated successor: '+p);
 const prior=Buffer.from(e[side+'_utf8']);
 if(hash(prior)!==e[side+'_sha256'])throw Error('Corrupt integration source: '+p);
 return prior;
}

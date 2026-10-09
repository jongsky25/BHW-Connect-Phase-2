import {lesson165View} from './lesson-165-integration.mjs';
// Validate the actual integrated bytes before exposing either immutable review.
import fs from 'node:fs';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync('docs/lesson-164-integration-receipt.json'));
export function lesson164View(p,side,actual=fs.readFileSync(p)){
 actual=lesson165View(p,'approvedMain',actual);
 const e=receipt.files[p];if(!e)return actual;
 if(!['reviewed164','approvedMain'].includes(side))throw Error('Invalid 1.6.4 integration view');
 if(sha(actual)!==e.integrated_sha256)throw Error('Unpinned integrated successor: '+p);
 const prior=Buffer.from(e[side+'_utf8']);if(sha(prior)!==e[side+'_sha256'])throw Error('Corrupt 1.6.4 integration view: '+p);
 return prior;
}

// Verify exact integrated successors before exposing immutable reviewed/main views.
import fs from 'node:fs';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync('docs/lesson-165-integration-receipt.json'));
export function lesson165View(p,side,actual=fs.readFileSync(p)){
 const e=receipt.files[p];if(!e)return actual;
 if(!['reviewed165','approvedMain'].includes(side))throw Error('Invalid 1.6.5 integration view');
 if(sha(actual)!==e.integrated_sha256)throw Error('Unpinned integrated successor: '+p);
 const prior=Buffer.from(e[side+'_utf8']);if(sha(prior)!==e[side+'_sha256'])throw Error('Corrupt 1.6.5 integration view: '+p);
 return prior;
}

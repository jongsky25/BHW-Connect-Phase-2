// Exact merged bytes expose immutable approved draft and upstream views.
import fs from 'node:fs';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync('docs/lesson-172-release-integration.json'));
export function release172View(p,side,actual=fs.readFileSync(p)){
 if(!['reviewed172','approvedMain'].includes(side))throw Error('Invalid release integration view');
 const e=receipt.files[p];if(!e)return actual;
 if(sha(actual)!==e.integrated_sha256)return actual;
 const prior=Buffer.from(e[side+'_utf8']);if(sha(prior)!==e[side+'_sha256'])throw Error('Corrupt release view: '+p);
 return prior;
}

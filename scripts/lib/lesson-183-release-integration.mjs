import {release184View} from './lesson-184-release-integration.mjs';
// Validate exact release successors before historical guards read either reviewed side.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
let releaseReceipt;
export function release183View(p,side,actual=fs.readFileSync(p)){
 actual=release184View(p,'approvedMain',actual);
 if(!['reviewed183','approvedMain'].includes(side))throw Error('Invalid 1.8.3 release view');
 const file='docs/lesson-183-release-integration.json';if(!fs.existsSync(file))return actual;
 const r=releaseReceipt??=JSON.parse(fs.readFileSync(file)),e=r.files[p];if(!e)return actual;
 if(![e.integrated_sha256,e.reviewed183_sha256,e.approvedMain_sha256].includes(sha(actual)))throw Error('Unpinned integrated successor (1.8.3 release): '+p);
 const prior=Buffer.from(e[side+'_utf8']);if(sha(prior)!==e[side+'_sha256'])throw Error('Corrupt 1.8.3 release view: '+p);
 return prior;
}

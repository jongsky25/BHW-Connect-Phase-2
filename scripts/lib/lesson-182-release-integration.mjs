// Validate exact release successors before historical guards read either reviewed side.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
let releaseReceipt;
export function release182View(p,side,actual=fs.readFileSync(p)){
 if(!['reviewed182','approvedMain'].includes(side))throw Error('Invalid 1.8.2 release view');
 const file='docs/lesson-182-release-integration.json';if(!fs.existsSync(file))return actual;
 const r=releaseReceipt??=JSON.parse(fs.readFileSync(file)),e=r.files[p];if(!e)return actual;
 if(![e.integrated_sha256,e.reviewed182_sha256,e.approvedMain_sha256].includes(sha(actual)))throw Error('Unpinned integrated successor (1.8.2 release): '+p);
 const prior=Buffer.from(e[side+'_utf8']);if(sha(prior)!==e[side+'_sha256'])throw Error('Corrupt 1.8.2 release view: '+p);
 return prior;
}

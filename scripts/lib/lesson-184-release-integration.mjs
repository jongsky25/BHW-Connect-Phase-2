import {beforeLesson191} from './lesson-191-integration.mjs';
// Exact byte-bound historical views; runtime content always reads current files.
import fs from 'node:fs';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
let receipt;
export function release184View(p,side,actual=fs.readFileSync(p)){
 actual=beforeLesson191(p,actual);
 if(!['reviewed184','approvedMain'].includes(side))throw Error('Invalid 1.8.4 release view');
 const r=receipt??=JSON.parse(fs.readFileSync('docs/lesson-184-release-integration.json')),e=r.files[p];if(!e)return actual;
 if(![e.integrated_sha256,e.reviewed184_sha256,e.approvedMain_sha256].includes(sha(actual)))throw Error('Unpinned integrated successor (1.8.4 release): '+p);
 const prior=Buffer.from(e[side+'_utf8']);if(sha(prior)!==e[side+'_sha256'])throw Error('Corrupt 1.8.4 release view: '+p);
 return prior;
}

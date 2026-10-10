import {release181View} from './lesson-181-release-integration.mjs';
// Exact draft bytes are checked before exposing immutable pre-1.8.1 bytes to release guards.
// Current target content/media are independently checked by lesson-181 tests and media verification.
import fs from 'node:fs';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const r=JSON.parse(fs.readFileSync('docs/lesson-181-proposal-receipt.json'));
export function beforeLesson181(p,actual=fs.readFileSync(p)){
 const pinned=r.changed_existing_files[p];if(pinned&&sha(actual)===pinned.predecessor_sha256)return actual;
 actual=release181View(p,'reviewed181',actual);
 if(r.target!=='safety-identify'||r.owner_release_approval!==false)throw Error('Invalid 1.8.1 draft scope');
 const e=r.changed_existing_files[p];if(!e)return actual;
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned integrated successor (1.8.1): '+p);
 const prior=Buffer.from(e.predecessor_utf8);if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt 1.8.1 predecessor: '+p);
 return prior;
}

// Hash-bound predecessor view for historical checks only; current loaders use current bytes.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/';
const shared=new Set(['content/training/day1-basic-competencies/narration.json','scripts/lib/lesson-191-integration.mjs','scripts/tests/lesson-191-release.test.mjs','scripts/lib/lesson-192-integration.mjs','src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','scripts/tests/lesson-192-release.test.mjs']);
let receipt,earlierReceipt,auditReceipt;
export function beforeLesson193(p,actual=fs.readFileSync(p)){
 const r=receipt??=JSON.parse(fs.readFileSync('docs/lesson-193-proposal-receipt.json'));
 if(r.target!=='resources-monitor'||r.owner_release_approval!==false||Object.keys(r.changed_existing_files).some(key=>!key.startsWith(leaf)&&!shared.has(key)))throw Error('Invalid lesson 1.9.3 preservation scope');
 const e=r.changed_existing_files[p];if(!e)return actual;
 if(sha(fs.readFileSync(p))!==e.proposed_sha256)throw Error('Unpinned integrated successor; Unpinned lesson 1.9.3 successor: '+p);
 // Preserve idempotence of the already approved 1.9.2 predecessor guard.
 const earlier=(earlierReceipt??=JSON.parse(fs.readFileSync('docs/lesson-192-proposal-receipt.json'))).changed_existing_files[p];
 if(earlier&&sha(actual)===earlier.predecessor_sha256&&sha(Buffer.from(earlier.predecessor_utf8))===earlier.predecessor_sha256)return actual;
 const audit=(auditReceipt??=JSON.parse(fs.readFileSync('docs/lesson-191-proposal-receipt.json'))).changed_existing_files[p];
 if(audit&&sha(actual)===audit.predecessor_sha256&&sha(Buffer.from(audit.predecessor_utf8))===audit.predecessor_sha256)return actual;
 if(![e.proposed_sha256,e.predecessor_sha256].includes(sha(actual)))throw Error('Unpinned integrated successor; Unpinned lesson 1.9.3 successor: '+p);
 const prior=Buffer.from(e.predecessor_utf8);
 if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt lesson 1.9.3 predecessor: '+p);
 return prior;
}

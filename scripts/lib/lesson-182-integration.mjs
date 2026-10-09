// Validate the exact scoped successor before exposing immutable historical bytes.
// Current lesson/audio checks use real files; this bridge is for frozen prior packages only.
import fs from 'node:fs';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync('docs/lesson-182-proposal-receipt.json'));
const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-controls/';
const shared=new Set(['content/training/day1-basic-competencies/narration.json','scripts/lib/lesson-174-proposal.mjs','scripts/tests/lesson-172.test.mjs','scripts/tests/lesson-174-release.test.mjs','remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx','.github/workflows/remotion.yml','.github/workflows/ci.yml']);
export function beforeProposed182(p,actual=fs.readFileSync(p)){
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if(receipt.target!=='safety-controls'||receipt.owner_release_approval!==false||(!p.startsWith(leaf)&&!shared.has(p)))throw Error('Invalid lesson 1.8.2 predecessor scope: '+p);
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned integrated successor (lesson 1.8.2): '+p);
 const prior=Buffer.from(e.predecessor_utf8);if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt lesson 1.8.2 predecessor: '+p);
 return prior;
}

import {release184View} from './lesson-184-release-integration.mjs';
// Exact successor validation before exposing frozen historical approval bytes.
// This never changes the current lesson/narration view or release approval.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync('docs/lesson-184-proposal-receipt.json'));
const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-demonstrate/';
const shared=new Set(['content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx','scripts/lib/lesson-174-proposal.mjs','scripts/tests/lesson-174-release.test.mjs']);
export function beforeLesson184(p,actual=fs.readFileSync(p)){
 actual=release184View(p,'reviewed184',actual);
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if(receipt.target!=='safety-demonstrate'||receipt.owner_release_approval!==false||(!p.startsWith(leaf)&&!shared.has(p)))throw Error('Invalid 1.8.4 preservation scope');
 if(hash(actual)!==e.proposed_sha256)throw Error('Unpinned integrated successor (lesson 1.8.4): '+p);
 const prior=Buffer.from(e.predecessor_utf8);if(hash(prior)!==e.predecessor_sha256)throw Error('Corrupt 1.8.4 predecessor: '+p);
 return prior;
}

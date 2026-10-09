// Hash-pinned predecessor view for historical preservation assertions only.
// No approval, publication, or narration-current exclusions.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-prepare/';
const shared=new Set(['content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','scripts/lib/lesson-174-proposal.mjs','src/components/elearning/reference-lessons.tsx','scripts/tests/lesson-174-release.test.mjs']);
const receipt=JSON.parse(fs.readFileSync('docs/lesson-183-proposal-receipt.json'));
const predecessors=new Map();
export function beforeProposed183(p,actual=fs.readFileSync(p)){
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if(receipt.status!=='draft'||receipt.target!=='safety-prepare'||receipt.owner_release_approval!==false||(!p.startsWith(leaf)&&!shared.has(p)))throw Error('Invalid lesson 1.8.3 preservation scope');
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned integrated successor; Unpinned lesson 1.8.3 successor: '+p);
 if(predecessors.has(p))return Buffer.from(predecessors.get(p));
 const prior=Buffer.from(e.predecessor_utf8);
 if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt lesson 1.8.3 predecessor: '+p);
 predecessors.set(p,prior);
 return Buffer.from(prior);
}

// Verify exact draft successors before supplying immutable historical bytes.
// This is a preservation view, never release approval.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync('docs/lesson-173-proposal-receipt.json'));
const leaf='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-prioritize/';
const allowed=new Set(['src/components/elearning/reference-lessons.tsx','scripts/lib/lesson-165-integration.mjs','scripts/tests/lesson-165-integration.test.mjs']);
export function beforeProposed173(p,actual=fs.readFileSync(p)){
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if(receipt.status!=='draft'||receipt.target!=='problem-prioritize'||receipt.owner_release_approval!==false||(!p.startsWith(leaf)&&!allowed.has(p)))throw Error('Invalid 1.7.3 preservation scope');
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned integrated successor: 1.7.3 '+p);
 const prior=Buffer.from(e.predecessor_utf8);if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt 1.7.3 predecessor: '+p);
 return prior;
}

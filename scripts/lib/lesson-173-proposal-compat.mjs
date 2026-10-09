import {release172View} from './lesson-172-release-integration.mjs';
// Verify exact draft successors before supplying immutable historical bytes.
// This is a preservation view, never release approval.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync('docs/lesson-173-proposal-receipt.json'));
const leaf='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-prioritize/';
const allowed=new Set(['src/components/elearning/reference-lessons.tsx','scripts/lib/lesson-165-integration.mjs','scripts/tests/lesson-165-integration.test.mjs','scripts/lib/lesson-171-integration.mjs','scripts/tests/lesson-171-release.test.mjs']);
export function reviewed173(p,actual=fs.readFileSync(p)){
 actual=release172View(p,'approvedMain',actual);
 const approvalPath='docs/lesson-173-owner-approval.json';
 if(p!==leaf+'lesson.json'||!fs.existsSync(approvalPath))return actual;
 const a=JSON.parse(fs.readFileSync(approvalPath));
 if(!a.reviewed_lesson_utf8)return actual;
 if(a.authorization!=='approved. merge and deploy'||a.lesson_keys.length!==1||a.lesson_keys[0]!=='problem-prioritize'||sha(actual)!==a.integrated_source_sha256[p])throw Error('Unpinned approved 1.7.3 successor: '+p);
 const prior=Buffer.from(a.reviewed_lesson_utf8);if(sha(prior)!==a.reviewed_lesson_sha256)throw Error('Corrupt reviewed 1.7.3 source');
 return prior;
}
export function beforeProposed173(p,actual=fs.readFileSync(p)){
 actual=reviewed173(p,actual);
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if(receipt.status!=='draft'||receipt.target!=='problem-prioritize'||receipt.owner_release_approval!==false||(!p.startsWith(leaf)&&!allowed.has(p)))throw Error('Invalid 1.7.3 preservation scope');
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned integrated successor: 1.7.3 '+p);
 const prior=Buffer.from(e.predecessor_utf8);if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt 1.7.3 predecessor: '+p);
 return prior;
}

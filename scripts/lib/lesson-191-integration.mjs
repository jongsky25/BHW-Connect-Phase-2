// Validate exact current successors before exposing the preserved main bytes to
// historical release guards. Runtime and narration freshness read current files.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-audit/';
const shared=new Set(['content/training/day1-basic-competencies/modules/09-sustainable-practices/module.json','content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx','.github/workflows/remotion.yml','scripts/lib/lesson-184-release-integration.mjs','scripts/tests/lesson-184-release.test.mjs','scripts/lib/lesson-192-integration.mjs','scripts/tests/lesson-192-release.test.mjs']);
const receipt=JSON.parse(fs.readFileSync('docs/lesson-191-proposal-receipt.json'));
export function beforeLesson191(p,actual=fs.readFileSync(p)){
 const r=receipt;
 const e=r.changed_existing_files[p];if(!e)return actual;
 if(r.target!=='resources-audit'||r.owner_release_approval!==false||(!p.startsWith(leaf)&&!shared.has(p)))throw Error('Invalid 1.9.1 preservation scope: '+p);
 if(sha(fs.readFileSync(p))!==e.proposed_sha256||![e.proposed_sha256,e.predecessor_sha256].includes(sha(actual)))throw Error('Unpinned integrated successor (lesson 1.9.1): '+p);
 const prior=Buffer.from(e.predecessor_utf8);
 if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt 1.9.1 predecessor: '+p);
 return prior;
}

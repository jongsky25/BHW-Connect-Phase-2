import {beforeLesson191} from './lesson-191-integration.mjs';
import {reviewed192View} from './lesson-192-release-integration.mjs';
// Validate exact draft successors before historical guards see pinned main bytes.
// Runtime content and global narration-current checks always use actual files.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-safe-change/';
const allowed=new Set(['lesson.json','read.fil.md','read.en.md','slides.json','facilitator.fil.md','facilitator.en.md'].map(p=>leaf+p).concat('content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','.github/workflows/remotion.yml','scripts/lib/reference-narration.mjs','src/components/elearning/reference-lessons.tsx','scripts/lib/lesson-184-release-integration.mjs','scripts/tests/lesson-184-release.test.mjs'));
const receipt=JSON.parse(fs.readFileSync('docs/lesson-192-proposal-receipt.json'));
export function beforeLesson192(p,actual=fs.readFileSync(p)){
 const e=receipt.changed_existing_files[p];if(!e)return beforeLesson191(p,actual);
 if(receipt.status!=='draft'||receipt.target!=='resources-safe-change'||receipt.owner_release_approval!==false||!allowed.has(p))throw Error('Invalid lesson 1.9.2 preservation scope');
 if(sha(actual)===e.predecessor_sha256)return actual;
 actual=beforeLesson191(p,actual);
 actual=reviewed192View(p,actual);
 const hash=sha(actual);
 if(hash!==e.proposed_sha256)throw Error('Unpinned integrated successor (lesson 1.9.2): '+p);
 const prior=Buffer.from(e.predecessor_utf8,'utf8');
 if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt lesson 1.9.2 predecessor: '+p);
 return prior;
}

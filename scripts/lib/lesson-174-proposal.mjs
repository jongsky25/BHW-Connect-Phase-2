// Exact draft successors are checked before historical guards see pinned main bytes.
// No narration/public-media/approval predecessor views are permitted.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..');
const leaf='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-action-plan/';
const allowed=new Set(['lesson.json','read.fil.md','read.en.md','slides.json','competency.json','facilitator.fil.md','facilitator.en.md'].map(p=>leaf+p).concat('src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','content/training/day1-basic-competencies/narration.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function beforeProposed174(p,actual=fs.readFileSync(path.join(root,p))){
 const receipt=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-174-proposal-receipt.json'),'utf8'));
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if(receipt.status!=='draft'||receipt.owner_release_approval!==false||receipt.target!=='problem-action-plan'||!allowed.has(p))throw Error('Invalid 1.7.4 proposal scope');
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned integrated successor (lesson 1.7.4): '+p);
 let prior;
 if(e.predecessor_narration){const m=JSON.parse(actual);m.lessons['problem-action-plan']=e.predecessor_narration.lesson;if(e.predecessor_narration.history===null)delete m.history?.['problem-action-plan'];else m.history['problem-action-plan']=e.predecessor_narration.history;prior=Buffer.from(JSON.stringify(m,null,2)+'\n');}
 else prior=Buffer.from(e.predecessor_utf8,'utf8');
 if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt lesson 1.7.4 predecessor: '+p);
 return prior;
}

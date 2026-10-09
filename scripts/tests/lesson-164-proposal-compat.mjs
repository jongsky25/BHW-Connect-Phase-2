import {lesson164View} from '../lib/lesson-164-integration.mjs';
// Verify the proposed bytes before exposing the immutable approved predecessor.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-record/';
const allowed=new Set(['remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx','scripts/lib/reference-narration.mjs','content/training/day1-basic-competencies/narration.json']);
export function beforeProposed164(p){
 const actual=lesson164View(p,'reviewed164',fs.readFileSync(path.join(root,p)));
 const receipt=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-164-proposal-receipt.json'),'utf8'));
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if((!allowed.has(p)&&!p.startsWith(leaf))||receipt.status!=='draft'||receipt.owner_release_approval!==false||receipt.target!=='communication-record')throw Error('Invalid lesson 1.6.4 scope');
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned lesson 1.6.4 successor: '+p);
 let prior;
 if(e.predecessor_narration){const m=JSON.parse(actual);m.lessons['communication-record']=e.predecessor_narration.lesson;if(e.predecessor_narration.history===null)delete m.history['communication-record'];else m.history['communication-record']=e.predecessor_narration.history;prior=Buffer.from(JSON.stringify(m,null,2)+'\n');}
 else prior=Buffer.from(e.predecessor_utf8,'utf8');
 if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt lesson 1.6.4 predecessor: '+p);
 return prior;
}

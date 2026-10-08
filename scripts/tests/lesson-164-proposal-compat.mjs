// Verify the proposed bytes before exposing the immutable approved predecessor.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-record/';
const allowed=new Set(['remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','content/training/day1-basic-competencies/narration.json']);
export function beforeProposed164(p){
 const actual=fs.readFileSync(path.join(root,p));
 const receipt=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-164-proposal-receipt.json'),'utf8'));
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if((!allowed.has(p)&&!p.startsWith(leaf))||receipt.status!=='draft'||receipt.owner_release_approval!==false||receipt.target!=='communication-record')throw Error('Invalid lesson 1.6.4 scope');
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned lesson 1.6.4 successor: '+p);
 const prior=Buffer.from(e.predecessor_utf8,'utf8');
 if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt lesson 1.6.4 predecessor: '+p);
 return prior;
}

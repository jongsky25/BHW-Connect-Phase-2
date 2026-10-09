import {lesson165View} from '../lib/lesson-165-integration.mjs';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-handoff/';
const shared=new Set(['src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','content/training/day1-basic-competencies/narration.json']);
const receipt=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-165-proposal-receipt.json'),'utf8'));
export function beforeProposed165(p){
 const actual=lesson165View(p,'reviewed165',fs.readFileSync(path.join(root,p)));
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if((!shared.has(p)&&!p.startsWith(leaf))||receipt.status!=='draft'||receipt.owner_release_approval!==false||receipt.predecessor_sha!=='27d4752324f4fd50183fcb60a408e537cc784ae4')throw Error('Invalid 1.6.5 predecessor scope');
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned 1.6.5 successor: '+p);
 const predecessor=Buffer.from(e.predecessor_utf8,'utf8');
 if(sha(predecessor)!==e.predecessor_sha256)throw Error('Corrupt 1.6.5 predecessor: '+p);
 return predecessor;
}

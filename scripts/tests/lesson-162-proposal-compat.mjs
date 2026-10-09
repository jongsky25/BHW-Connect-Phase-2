// Verify the actual proposed bytes FIRST, then expose pinned approved predecessors
// to unchanged historical release assertions. No sibling exemptions or approval.
import {reviewed162Bytes} from '../lib/lesson-162-release-compat.mjs';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify/';
const allowed=new Set(['src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','content/training/day1-basic-competencies/narration.json',...['lesson.json','slides.json','read.fil.md','read.en.md','facilitator.fil.md','facilitator.en.md','competency.json'].map(p=>leaf+p)]);
const cache=new Map();
function readJSON(file){
 const absolute=path.join(root,file),stat=fs.statSync(absolute,{bigint:true}),key=stat.mtimeNs+':'+stat.size;
 const hit=cache.get(file);if(hit?.key===key)return hit.value;
 const value=JSON.parse(fs.readFileSync(absolute));cache.set(file,{key,value});return value;
}
export function beforeProposed162(p){
 const actual=reviewed162Bytes(p,fs.readFileSync(path.join(root,p)));
 const receipt=readJSON('docs/lesson-162-proposal-receipt.json');
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if(!allowed.has(p)||receipt.status!=='draft'||receipt.owner_release_approval!==false||receipt.target!=='communication-clarify'||receipt.predecessor_sha!=='27d4752324f4fd50183fcb60a408e537cc784ae4')throw Error('Invalid scoped 1.6.2 proposal: '+p);
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned 1.6.2 successor: '+p);
 const predecessor=Buffer.from(e.predecessor_utf8,'utf8');
 const baseline=readJSON('docs/lesson-162-baseline.json');
 if(sha(predecessor)!==e.predecessor_sha256||e.predecessor_sha256!==baseline.files_sha256[p])throw Error('Corrupt 1.6.2 approved predecessor: '+p);
 return predecessor;
}

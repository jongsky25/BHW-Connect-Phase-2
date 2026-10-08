// A bounded historical view for released-lesson checks. It is not release approval.
// Validate the actual proposed bytes before recovering their pinned predecessor.
// The 1.5.5 tests independently check actual draft content, old media and mappings.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const receipt=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-155-proposal-receipt.json'),'utf8'));
export const selfManagementLeaf='content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-self-management/';
export function beforeProposed155(p){
 const actual=fs.readFileSync(path.join(root,p));
 const entry=receipt.changed_existing_files[p];
 if(!entry)return actual;
 if(receipt.status!=='draft'||receipt.owner_release_approval!==false)throw Error('1.5.5 proposal must not claim release approval');
 if(sha(actual)!==entry.proposed_sha256)throw Error('Unreviewed change beyond pinned 1.5.5 draft: '+p);
 let predecessor;
 if(entry.predecessor_narration){const m=JSON.parse(actual);m.lessons['bhw-self-management']=entry.predecessor_narration.lesson;if(entry.predecessor_narration.history===null)delete m.history['bhw-self-management'];else m.history['bhw-self-management']=entry.predecessor_narration.history;predecessor=Buffer.from(JSON.stringify(m,null,2)+'\n');}
 else predecessor=Buffer.from(entry.predecessor_utf8,'utf8');
 if(sha(predecessor)!==entry.predecessor_sha256)throw Error('Corrupt 1.5.5 predecessor bytes: '+p);
 // Never permit predecessor views of released lesson directories or public media.
 const allowed= p.startsWith(selfManagementLeaf)||[
  'content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lesson.en.md',
  'content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lesson.fil.md',
  'content/training/day1-basic-competencies/modules/05-bhw-at-barangay/qa-entries.json',
  'content/training/day1-basic-competencies/narration.json',
  'scripts/lib/reference-narration.mjs','scripts/lib/tts-providers/gemini.mjs',
  'remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx',
 ].includes(p);
 if(!allowed)throw Error('1.5.5 proposal exceeds allowed historical-view scope: '+p);
 return predecessor;
}

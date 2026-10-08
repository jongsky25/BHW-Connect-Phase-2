import {beforeProposed155} from './lesson-155-proposal-compat.mjs';
// Exact owner-approved successor bytes; prior release receipts stay immutable.
import path from 'node:path';
import {createHash} from 'node:crypto';
import {expect} from 'vitest';
const root=path.resolve(import.meta.dirname,'../..');
const receipt=JSON.parse(read155(path.join(root,'docs/lesson-156-owner-approval.json'),'utf8'));
export const rightContactLeaf='content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-right-contact/';
export const approved156LessonPaths=['competency.json','facilitator.en.md','facilitator.fil.md','lesson.json','read.en.md','read.fil.md','slides.json'].map(p=>rightContactLeaf+p);
export function approved156Path(p){
 expect(receipt.interpreted_authorization).toBe('merge and deploy to live');
 expect(receipt.reviewed_head).toBe('78f065972fed0c6a6d71ef9d6bec8ca250a4c51d');
 expect(receipt.approved_source_sha256[p]).toMatch(/^[a-f0-9]{64}$/);
 expect(createHash('sha256').update(read155(path.join(root,p))).digest('hex')).toBe(receipt.approved_source_sha256[p]);
}
export function beforeApproved156(p){
 if(Object.hasOwn(receipt.predecessor_shared_files,p)){approved156Path(p);return receipt.predecessor_shared_files[p];}
 return read155(path.join(root,p),'utf8');
}
export function withoutApproved156Registry(source){
 approved156Path('remotion/src/Root.tsx');
 expect((source.match(/id=\{language === "fil" \? "BhwRightContactStoryFil"/g)??[])).toHaveLength(1);
 return source.replace(/^import \{BhwRightContactStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`bhw-right-contact-[\s\S]*?      \)\)\}\n/,'');
}

function read155(p,encoding){const bytes=beforeProposed155(path.relative(root,p));return encoding?bytes.toString(encoding):bytes;}

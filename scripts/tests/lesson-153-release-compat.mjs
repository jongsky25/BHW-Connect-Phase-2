// Exact approved successor hashes keep the released 1.5.1/1.5.2 baselines immutable.
// Every newly accepted 1.5.3 source byte is pinned in the owner approval receipt.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {expect} from 'vitest';

const root=path.resolve(import.meta.dirname,'../..');
const receipt=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-153-owner-approval.json'),'utf8'));
export const localPartnersLeaf='content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-local-partners/';
export const approved153Path=p=>{
  expect(receipt.authorization).toBe('approved. merge and deploy to live');
  expect(receipt.approved_source_sha256[p]).toMatch(/^[a-f0-9]{64}$/);
  expect(createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')).toBe(receipt.approved_source_sha256[p]);
};
export const approved153LessonPaths=['competency.json','facilitator.en.md','facilitator.fil.md','lesson.json','read.en.md','read.fil.md','slides.json'].map(p=>localPartnersLeaf+p);
export function withoutApproved153Registry(source) {
  approved153Path('remotion/src/Root.tsx');
  expect(source).toContain('BhwLocalPartnersStoryFil');
  expect(source).toContain('BhwLocalPartnersStoryEn');
  return source.replace(/^import \{BhwLocalPartnersStory[^\n]+\n/,'')
    .replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`bhw-local-partners-[\s\S]*?      \)\)\}\n/,'');
}

import {beforeApproved154,withoutApproved154Registry} from './lesson-154-release-compat.mjs';
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
  expect(createHash('sha256').update(['content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lesson.en.md','content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lesson.fil.md','content/training/day1-basic-competencies/modules/05-bhw-at-barangay/qa-entries.json'].includes(p)?beforeApproved154(p):fs.readFileSync(path.join(root,p))).digest('hex')).toBe(receipt.approved_source_sha256[p]);
};
export const approved153LessonPaths=['competency.json','facilitator.en.md','facilitator.fil.md','lesson.json','read.en.md','read.fil.md','slides.json'].map(p=>localPartnersLeaf+p);
export function approved153HistoricalMapping(manifest, oldHash, hashTrack, hashObject) {
  approved153Path('content/training/day1-basic-competencies/narration.json');
  const old=manifest.history['bhw-local-partners'].find(v=>hashObject(v)===oldHash);
  expect(old).toBeDefined();
  for(const languages of Object.values(old.sections))for(const track of Object.values(languages))expect(hashTrack(track.src)).toBe(track.sha256);
}
export function approved153HistoryPrefix(manifest) {
  approved153Path('content/training/day1-basic-competencies/narration.json');
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-152-current-baseline.json'),'utf8'));
  const old=baseline.original_history['bhw-local-partners'];
  expect(manifest.history['bhw-local-partners'].slice(0,old.length)).toEqual(old);
}
export function withoutApproved153Registry(source) {
  approved153Path('remotion/src/Root.tsx');
  expect(source).toContain('BhwLocalPartnersStoryFil');
  expect(source).toContain('BhwLocalPartnersStoryEn');
  return withoutApproved154Registry(source).replace(/^import \{BhwLocalPartnersStory[^\n]+\n/,'')
    .replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`bhw-local-partners-[\s\S]*?      \)\)\}\n/,'');
}

import {beforeApproved156,withoutApproved156Registry} from './lesson-156-release-compat.mjs';
// Exact approved successor bytes; original released baselines stay immutable.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {expect} from 'vitest';
const root=path.resolve(import.meta.dirname,'../..');
const receipt=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-154-owner-approval.json'),'utf8'));
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-154-current-baseline.json'),'utf8'));
export const teamworkLeaf='content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-teamwork/';
export const approved154LessonPaths=['competency.json','facilitator.en.md','facilitator.fil.md','lesson.json','read.en.md','read.fil.md','slides.json'].map(p=>teamworkLeaf+p);
export function approved154Path(p){
 expect(receipt.interpreted_authorization).toBe('merge and deploy to live');
 expect(receipt.reviewed_head).toBe('e1949678a1134c4b2966d785fcf9274e589166be');
 expect(receipt.approved_source_sha256[p]).toMatch(/^[a-f0-9]{64}$/);
 expect(createHash('sha256').update(beforeApproved156(p)).digest('hex')).toBe(receipt.approved_source_sha256[p]);
}
export function withoutApproved154Registry(source){
 approved154Path('remotion/src/Root.tsx');
 expect((source.match(/id=\{language === "fil" \? "BhwTeamworkStoryFil"/g)??[])).toHaveLength(1);
 return withoutApproved156Registry(source).replace(/^import \{BhwTeamworkStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`bhw-teamwork-[\s\S]*?      \)\)\}\n/,'');
}
export function beforeApproved154(p){
 approved154Path(p);
 if(receipt.predecessor_shared_files[p])return receipt.predecessor_shared_files[p];
 if(p==='remotion/src/Root.tsx')return withoutApproved154Registry(fs.readFileSync(path.join(root,p),'utf8'));
 if(p==='content/training/day1-basic-competencies/narration.json'){
  const m=JSON.parse(beforeApproved156(p));
  m.lessons['bhw-teamwork']=baseline.narration_manifest.lessons['bhw-teamwork'];
  m.history['bhw-teamwork']=baseline.narration_manifest.history['bhw-teamwork'];
  return JSON.stringify(m,null,2)+'\n';
 }
 throw Error('Unrecognized successor path: '+p);
}
export function approved154HistoricalMapping(manifest,oldHash,hashTrack,hashObject){
 approved154Path('content/training/day1-basic-competencies/narration.json');
 const old=manifest.history['bhw-teamwork'].find(v=>hashObject(v)===oldHash);expect(old).toBeDefined();
 for(const languages of Object.values(old.sections))for(const track of Object.values(languages))expect(hashTrack(track.src)).toBe(track.sha256);
}
export function approved154HistoryPrefix(manifest){
 approved154Path('content/training/day1-basic-competencies/narration.json');
 const old=baseline.narration_manifest.history['bhw-teamwork'];
 expect(manifest.history['bhw-teamwork'].slice(0,old.length)).toEqual(old);
}

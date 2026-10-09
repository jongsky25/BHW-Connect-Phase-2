import {beforeLesson172} from '../lib/lesson-172-integration.mjs';
// @vitest-environment node
import {describe,it,expect} from 'vitest';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {lesson165View} from '../lib/lesson-165-integration.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),j=p=>JSON.parse(beforeLesson172(p));
describe('approved 1.6.5 integration and release',()=>{
 it('verifies every exact successor and immutable view and rejects unpinned bytes',()=>{
  const r=j('docs/lesson-165-integration-receipt.json');
  for(const [p,e]of Object.entries(r.files)){
   expect(sha(beforeLesson172(p)),p).toBe(e.integrated_sha256);
   for(const side of ['reviewed165','approvedMain'])expect(sha(lesson165View(p,side)),p).toBe(e[side+'_sha256']);
   expect(()=>lesson165View(p,'approvedMain',Buffer.from('changed'))).toThrow('Unpinned');
  }
  for(const [p,h]of Object.entries(r.protected_main_sha256))expect(sha(beforeLesson172(p)),p).toBe(h);
 },30000);
 it('preserves latest sibling selections/history and appends only two compositions',()=>{
  const p='content/training/day1-basic-competencies/narration.json',actual=j(p),main=JSON.parse(lesson165View(p,'approvedMain')),review=JSON.parse(lesson165View(p,'reviewed165'));
  for(const [k,v]of Object.entries(main.lessons))if(k!=='communication-handoff'){expect(actual.lessons[k],k).toEqual(v);expect(actual.history[k],k).toEqual(main.history[k]);}
  expect(actual.lessons['communication-handoff']).toEqual(review.lessons['communication-handoff']);expect(actual.history['communication-handoff']).toEqual(review.history['communication-handoff']);
  const source=beforeLesson172('remotion/src/Root.tsx').toString();const restored=source.replace(/^import \{CommunicationHandoffStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`communication-handoff-[\s\S]+?      \)\)\}\n/,'');expect(restored).toBe(lesson165View('remotion/src/Root.tsx','approvedMain').toString());
 });
 it('binds owner authorization and promotes only seven reviewed target statuses',()=>{
  const a=j('docs/lesson-165-owner-approval.json');expect(a.authorization).toBe('approved. merge and deploy to live');expect(a.lesson_keys).toEqual(['communication-handoff']);
  expect(a.reviewed_proposal_receipt_sha256).toBe(sha(fs.readFileSync('docs/lesson-165-proposal-receipt.json')));
  const prior=JSON.parse(a.reviewed_lesson_utf8),actual=j('content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-handoff/lesson.json');let count=0;
  for(const [i,asset]of actual.assets.entries()){expect(asset.review_status).toBe('approved');if(prior.assets[i].review_status==='draft')count++;asset.review_status=prior.assets[i].review_status;}
  expect(count).toBe(7);expect(actual).toEqual(prior);
  for(const [p,h]of Object.entries(a.approved_source_sha256))expect(sha(beforeLesson172(p)),p).toBe(h);
  for(const m of a.approved_media)expect(sha(fs.readFileSync('public'+m.path))).toBe(m.sha256);
 });
});

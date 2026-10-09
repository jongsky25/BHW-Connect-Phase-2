import {lesson164View} from '../lib/lesson-164-integration.mjs';
// @vitest-environment node
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {communicationView} from '../lib/communication-integration.mjs';
const json=p=>JSON.parse(lesson164View(p,'approvedMain'));
const sha=b=>createHash('sha256').update(b).digest('hex');
describe('approved 1.6.2 and 1.6.3 integration',()=>{
 it('rejects any unpinned integrated successor and validates both immutable views',()=>{
  const r=json('docs/lesson-163-integration-receipt.json');
  for(const [p,e] of Object.entries(r.files)){
   expect(sha(lesson164View(p,'approvedMain'))).toBe(e.integrated_sha256);
   for(const side of ['reviewed163','approved162'])expect(sha(communicationView(p,side))).toBe(e[side+'_sha256']);
   expect(()=>communicationView(p,'reviewed163',Buffer.from('unapproved'))).toThrow('Unpinned integrated successor');
  }
 });
 it('retains both selected narrations and complete history while appending only the two new compositions',()=>{
  const p='content/training/day1-basic-competencies/narration.json',m=json(p);
  const old162=JSON.parse(communicationView(p,'approved162')),old163=JSON.parse(communicationView(p,'reviewed163'));
  for(const key of Object.keys(m.lessons)){
   const source=key==='communication-explain'?old163:old162;
   expect(m.lessons[key]).toEqual(source.lessons[key]);expect(m.history[key]).toEqual(source.history[key]);
  }
  const source=lesson164View('remotion/src/Root.tsx','approvedMain').toString();
  const prior=source.replace(/^import \{CommunicationExplainStory[^\n]+\n/m,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`communication-explain-[\s\S]+?      \)\)\}\n/,'');
  expect(prior).toBe(communicationView('remotion/src/Root.tsx','approved162').toString());
 });
 it('binds owner approval to the original receipt and promotes only seven asset statuses',()=>{
  const a=json('docs/lesson-163-owner-approval.json'),p='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/lesson.json';
  expect(a.authorization).toBe('approved. merge and deploy to live');expect(a.lesson_keys).toEqual(['communication-explain']);
  expect(a.reviewed_proposal_receipt_sha256).toBe(sha(fs.readFileSync('docs/lesson-163-proposal-receipt.json')));
  const original=JSON.parse(a.reviewed_lesson_utf8),current=json(p);let promoted=0;
  for(const [i,asset] of current.assets.entries()){
   expect(asset.review_status).toBe('approved');if(original.assets[i].review_status==='draft')promoted++;
   asset.review_status=original.assets[i].review_status;
  }
  expect(promoted).toBe(7);expect(current).toEqual(original);
  for(const [file,h] of Object.entries(a.approved_source_sha256))expect(sha(lesson164View(file,'approvedMain'))).toBe(h);
  for(const media of a.approved_media)expect(sha(fs.readFileSync('public'+media.path))).toBe(media.sha256);
 });
});

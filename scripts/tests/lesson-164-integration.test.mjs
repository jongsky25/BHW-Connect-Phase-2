// @vitest-environment node
import {describe,it,expect} from 'vitest';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {lesson164View} from '../lib/lesson-164-integration.mjs';
import {beforeProposed173} from '../lib/lesson-173-proposal-compat.mjs';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-record/';
describe('owner-approved 1.6.4 integration and release',()=>{
 it('validates both immutable views and rejects any unpinned bytes',()=>{
  const r=j('docs/lesson-164-integration-receipt.json');
  const shared=new Set(['src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','content/training/day1-basic-competencies/narration.json']);
  for(const [p,e]of Object.entries(r.files)){
   expect(sha(beforeProposed173(p))).toBe(e.integrated_sha256);
   for(const side of ['reviewed164','approvedMain'])expect(sha(lesson164View(p,side))).toBe(e[side+'_sha256']);
   expect(()=>lesson164View(p,'approvedMain',Buffer.from('changed'))).toThrow('Unpinned');
   if(!shared.has(p)&&!p.startsWith(leaf))expect(e.integrated_sha256,p).toBe(e.approvedMain_sha256);
  }
 });
 it('retains every current-main sibling narration and history and appends only two compositions',()=>{
  const p='content/training/day1-basic-competencies/narration.json',current=j(p),main=JSON.parse(lesson164View(p,'approvedMain'));
  for(const [k,v]of Object.entries(main.lessons))if(k!=='communication-record'){expect(current.lessons[k]).toEqual(v);expect(current.history[k]).toEqual(main.history[k]);}
  const source=fs.readFileSync('remotion/src/Root.tsx','utf8');
  const prior=source.replace(/^import \{CommunicationRecordStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`communication-record-[\s\S]+?      \)\)\}\n/,'');
  expect(prior).toBe(lesson164View('remotion/src/Root.tsx','approvedMain').toString());
 });
 it('binds the owner instruction to the exact review and promotes only seven statuses',()=>{
  const a=j('docs/lesson-164-owner-approval.json');expect(a.authorization).toBe('approved. merge and deploy to live');expect(a.lesson_keys).toEqual(['communication-record']);
  expect(a.reviewed_proposal_receipt_sha256).toBe(sha(fs.readFileSync('docs/lesson-164-proposal-receipt.json')));
  const original=JSON.parse(a.reviewed_lesson_utf8),current=j(leaf+'lesson.json');let promoted=0;
  for(const [i,asset]of current.assets.entries()){expect(asset.review_status).toBe('approved');if(original.assets[i].review_status==='draft')promoted++;asset.review_status=original.assets[i].review_status;}
  expect(promoted).toBe(7);expect(current).toEqual(original);
  for(const [p,h]of Object.entries(a.approved_source_sha256))expect(sha(beforeProposed173(p)),p).toBe(h);
  for(const m of a.approved_media)expect(sha(fs.readFileSync('public'+m.path))).toBe(m.sha256);
 });
});

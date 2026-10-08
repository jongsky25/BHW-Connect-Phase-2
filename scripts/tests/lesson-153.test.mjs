import {beforeProposed155} from './lesson-155-proposal-compat.mjs';
import {beforeApproved154} from './lesson-154-release-compat.mjs';
import {describe,it,expect} from 'vitest';

import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
const root=path.resolve(import.meta.dirname,'../..');
const base='content/training/day1-basic-competencies/modules/05-bhw-at-barangay';
const leaf=`${base}/lessons/bhw-local-partners`;
const file=p=>beforeProposed155(p);
const json=p=>JSON.parse(file(p));
const lesson=json(`${leaf}/lesson.json`);
const slides=json(`${leaf}/slides.json`);
const hash=p=>createHash('sha256').update(file(p)).digest('hex');
describe('lesson 1.5.3 content draft',()=>{
 it('binds approval to exact selected bytes and preserves old published audio selection',()=>{
  const approval=json('docs/lesson-153-owner-approval.json');
  expect(approval.authorization).toBe('approved. merge and deploy to live');
  expect(approval.approved_media).toHaveLength(25);
  for(const media of approval.approved_media)expect(hash('public'+media.path)).toBe(media.sha256);
  const manifest=json('content/training/day1-basic-competencies/narration.json');
  const old=json('docs/lesson-153-preapproval-published-snapshot.json').rows.find(r=>r.lesson.lesson_key==='bhw-local-partners').revision;
  const prior=json('docs/lesson-152-current-baseline.json').non_target_mappings['bhw-local-partners'];
  const authored=loadReferenceModule(path.join(root,base),path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='bhw-local-partners').revision;
  for(const lang of ['fil','en']){
   const selected=narrationForLesson(manifest,'bhw-local-partners',lang,old.read_sections);
   expect(Object.keys(selected)).toEqual(['section-6','section-7']);
   for(const id of Object.keys(selected))expect(selected[id].src).toBe(prior.sections[id][lang].src);
   const current=narrationForLesson(manifest,'bhw-local-partners',lang,authored.read_sections);
   expect(Object.keys(current)).toEqual(authored.read_sections.map(s=>s.id));
   for(const id of Object.keys(current))expect(current[id].src).toBe(manifest.lessons['bhw-local-partners'].sections[id][lang].src);
  }
 });
 it('retains original resume anchors, full bilingual read/slide narration parity and a visible picture on all six slides',()=>{
  const loaded=loadReferenceModule(path.join(root,base),path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='bhw-local-partners');
  expect(loaded.revision.read_sections).toHaveLength(6);expect(loaded.revision.slides).toHaveLength(6);
  expect(loaded.revision.read_sections.map(s=>s.id)).toContain('section-6');
  expect(loaded.revision.read_sections.map(s=>s.id)).toContain('section-7');
  expect(slides.map(s=>s.id)).toContain('slide-section-6');expect(slides.map(s=>s.id)).toContain('slide-section-7');
  for(const lang of ['fil','en']){
   const sections=parseReferenceRead(file(`${leaf}/read.${lang}.md`).toString());
   expect(sections.map(s=>s.id)).toEqual(lesson.sections.map(s=>s.id));
   for(const [i,s] of sections.entries())expect(slides[i][`narration_${lang}`]).toBe(s.body);
  }
  for(const slide of slides){
   expect(slide.asset_ids).toHaveLength(2);
   expect(slide.asset_ids).toContain('malou-local-coordination');
   for(const id of slide.asset_ids){const asset=lesson.assets.find(a=>a.id===id);expect(asset).toBeDefined();expect(hash(`public${asset.path}`)).toBe(asset.content_hash);}
  }
  expect(new Set(slides.map(s=>s.asset_ids[1])).size).toBe(6);
 });
 it('offers three choices with a rationale for each and one six-level indicator',()=>{
  const check=lesson.sections.at(-1).check;
  expect(check.options).toHaveLength(3);
  for(const lang of ['fil','en']){
   expect(check[`feedback_${lang}`]).toContain(lang==='en'?'First:':'Una:');
   expect(check[`feedback_${lang}`]).toContain(lang==='en'?'Second:':'Ikalawa:');
   expect(check[`feedback_${lang}`]).toContain(lang==='en'?'Third:':'Ikatlo:');
   const guide=file(`${leaf}/facilitator.${lang}.md`).toString();
   expect([...guide.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);
   expect(guide).toContain('180');expect(guide).toContain('30');expect(guide).toContain('20');
  }
  const indicators=json(`${leaf}/competency.json`).observation_indicators;
  expect(indicators).toHaveLength(1);expect(indicators[0].objective_index).toBe(0);
  expect(Object.keys(indicators[0].levels)).toHaveLength(6);
 });
 it('keeps the other ten shared QA rows unchanged from the verified creation baseline',()=>{
  const after=JSON.parse(beforeApproved154(`${base}/qa-entries.json`)).entries;
  expect(after.map(r=>r.id)).toEqual(['d1m5-four-relationships','d1m5-who-for-clinical','d1m5-who-for-admin-support','d1m5-role-of-peer-bhw','d1m5-punong-barangay','d1m5-local-health-board-composition','d1m5-other-stakeholders','d1m5-teamwork-practices','d1m5-self-management-skills','d1m5-self-management-improve']);
  const untouched=after.filter(r=>!['d1m5-local-health-board-composition','d1m5-other-stakeholders'].includes(r.id));
  expect(createHash('sha256').update(JSON.stringify(untouched)).digest('hex')).toBe('c27c65e14e9c328d93b5e49ea8f585710e801d357a31ae87cf33c7c207f688ae');
 });
});

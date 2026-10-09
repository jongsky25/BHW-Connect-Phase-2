// @vitest-environment node
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {beforeProposed173 as prior173,reviewed173 as reviewedPrior173} from '../lib/lesson-173-proposal-compat.mjs';
import {beforeProposed174} from '../lib/lesson-174-proposal.mjs';
const beforeProposed173=(p,actual=fs.readFileSync(p))=>prior173(p,beforeProposed174(p,actual));
const reviewed173=(p,actual=fs.readFileSync(p))=>reviewedPrior173(p,beforeProposed174(p,actual));
const root='content/training/day1-basic-competencies/',leaf=root+'modules/07-problema/lessons/problem-prioritize/';
const j=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=j('docs/lesson-173-handoff-baseline.json'),lesson=JSON.parse(reviewed173(leaf+'lesson.json'));
const loaded=loadReferenceModule(root+'modules/07-problema','public').lessons.find(l=>l.manifest.lesson_key==='problem-prioritize');
describe('1.7.3 draft preserves released content and scoring boundaries',()=>{
 it('binds owner approval and promotes only six reviewed illustration statuses',()=>{
  const a=j('docs/lesson-173-owner-approval.json');expect(a.authorization).toBe('approved. merge and deploy');expect(a.lesson_keys).toEqual(['problem-prioritize']);
  const current=j(leaf+'lesson.json'),prior=JSON.parse(reviewed173(leaf+'lesson.json'));let count=0;
  for(const [i,asset]of current.assets.entries()){expect(asset.review_status).toBe('approved');expect(prior.assets[i].review_status).toBe('draft');asset.review_status=prior.assets[i].review_status;count++;}
  expect(count).toBe(6);expect(current).toEqual(prior);
  for(const [p,h]of Object.entries(a.integrated_source_sha256))expect(sha(beforeProposed174(p)),p).toBe(h);
  expect(()=>reviewed173(leaf+'lesson.json',Buffer.from('changed'))).toThrow('Unpinned');
 });
 it('preserves identity, objectives, original ordered anchors and tie choices',()=>{
  expect(lesson.manifest).toEqual(baseline.manifest);
  expect(lesson.sections.map(s=>s.id)).toEqual(['criteria','worked-scores','score-evidence','tie-and-urgent-care','practice','check']);
  expect(lesson.sections.filter(s=>baseline.anchors.some(a=>a.id===s.id)).map(s=>({id:s.id,concept_ids:s.concept_ids}))).toEqual(baseline.anchors);
  const c=lesson.sections.at(-1).check;expect(c.options).toEqual(baseline.original_check.options);expect(c.correct_option_index).toBe(0);
  expect(c.prompt_fil).toBe(baseline.original_check.prompt_fil);expect(c.prompt_en).toBe(baseline.original_check.prompt_en);
 });
 it('pairs full Read/Slides bodies and verifies all hashed draft image bytes',()=>{
  for(const [i,s] of loaded.revision.read_sections.entries())for(const lang of ['fil','en'])expect(loaded.revision.slides[i]['narration_'+lang]).toBe(s['body_'+lang]);
  expect(lesson.assets).toHaveLength(6);for(const a of lesson.assets){expect(sha(fs.readFileSync('public'+a.path))).toBe(a.content_hash);expect(a.review_status).toBe('draft');}
 });
 it('retains the guide outline, one objective indicator and a feasible practice allocation',()=>{
  const indicators=j(leaf+'competency.json').observation_indicators;expect(indicators).toHaveLength(1);expect(indicators[0].objective_index).toBe(0);expect(Object.keys(indicators[0].levels)).toHaveLength(6);
  for(const lang of ['fil','en'])expect([...fs.readFileSync(leaf+`facilitator.${lang}.md`,'utf8').matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);
  expect(5+10+16+9+5).toBe(baseline.guided_minutes);expect(35+50+45+50).toBe(baseline.module_guided_minutes);
 });
 it('preserves every prior public byte, sibling lesson, narration history, UUID and source',()=>{
  const preserved=j('docs/lesson-173-implementation-baseline.json').protected_files;
  for(const [p,h]of Object.entries(preserved)){
   const bytes=fs.lstatSync(p).isSymbolicLink()?Buffer.from(fs.readlinkSync(p)):beforeProposed173(p);
   expect(sha(bytes),p).toBe(h);
  }
 },30000);
 it('rejects an unpinned draft byte before exposing any historical view',()=>{
  const receipt=j('docs/lesson-173-proposal-receipt.json');
  for(const [p,e]of Object.entries(receipt.changed_existing_files)){
   expect(sha(reviewed173(p)),p).toBe(e.proposed_sha256);
   expect(sha(beforeProposed173(p)),p).toBe(e.predecessor_sha256);
   expect(()=>beforeProposed173(p,Buffer.from('unreviewed mutation'))).toThrow('Unpinned');
  }
 });
 it('never selects stale narration for new text and retains selection for original published text',()=>{
  const mf=j(root+'narration.json');for(const lang of ['fil','en'])expect(narrationForLesson(mf,'problem-prioritize',lang,loaded.revision.read_sections)).toEqual({});
  const oldLesson=JSON.parse(beforeProposed173(leaf+'lesson.json'));
  const read=Object.fromEntries(['fil','en'].map(lang=>[lang,parseReferenceRead(beforeProposed173(leaf+`read.${lang}.md`).toString())]));
  const sections=read.fil.map((s,i)=>({...oldLesson.sections[i],heading_fil:s.heading,heading_en:read.en[i].heading,body_fil:s.body,body_en:read.en[i].body}));
  for(const lang of ['fil','en']){
   const oldSelected=narrationForLesson(mf,'problem-prioritize',lang,sections);
   expect(Object.keys(oldSelected)).toHaveLength(4);
   for(const s of sections)expect(oldSelected[s.id].src).toBe(baseline.target_narration.sections[s.id][lang].src);
  }
  expect(mf.lessons['problem-prioritize']).toEqual(baseline.target_narration);
 });
});

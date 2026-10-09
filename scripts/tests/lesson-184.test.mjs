// @vitest-environment node
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {beforeProposed174} from '../lib/lesson-174-proposal.mjs';
import {beforeLesson184} from '../lib/lesson-184-integration.mjs';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
const base='content/training/day1-basic-competencies/',leaf=base+'modules/08-osh/lessons/safety-demonstrate/';
const j=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=j('docs/lesson-184-handoff-baseline.json'),lesson=j(leaf+'lesson.json'),slides=j(leaf+'slides.json');
const ids=['exposure','return-demo','near-miss','care-before-paperwork','practice','check'];
describe('Apple lesson 1.8.4 draft boundaries',()=>{
 it('validates exact successors before recovering immutable predecessor bytes',()=>{
  const receipt=j('docs/lesson-184-proposal-receipt.json');
  for(const[p,e]of Object.entries(receipt.changed_existing_files)){expect(sha(beforeLesson184(p))).toBe(e.predecessor_sha256);expect(()=>beforeLesson184(p,Buffer.from('changed'))).toThrow('Unpinned');}
 });
 it('retains exact identity, original stable anchors/concepts and original answer choices/index',()=>{
  expect(lesson.manifest).toEqual(baseline.manifest);
  expect(lesson.sections.map(s=>s.id)).toEqual(ids);
  expect(slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
  for(const a of baseline.anchors)expect(lesson.sections.find(s=>s.id===a.id).concept_ids).toEqual(a.concept_ids);
  const current=lesson.sections.at(-1).check;
  expect(current.options).toEqual(baseline.original_check.options);
  expect(current.correct_option_index).toBe(0);
  for(const lang of ['fil','en'])expect(current['prompt_'+lang]).toBe(baseline.original_check['prompt_'+lang].replace('Ana','Apple'));
  expect(slides.at(-1).check).toEqual(current);
 });
 it('provides exactly paired full teaching in Read and Slides and all three post-choice rationales',()=>{
  const loaded=loadReferenceModule(base+'modules/08-osh','public').lessons.find(l=>l.manifest.lesson_key==='safety-demonstrate');
  for(const lang of ['fil','en']){
   const read=parseReferenceRead(fs.readFileSync(leaf+`read.${lang}.md`,'utf8'));
   expect(read.map(s=>s.id)).toEqual(ids);
   read.forEach((s,i)=>{expect(loaded.revision.slides[i]['narration_'+lang]).toBe(s.body);expect(s.body).not.toMatch(/Ana|33/);expect(slides[i]['display_'+lang].length).toBeLessThan(s.body.length);});
   const feedback=lesson.sections.at(-1).check['feedback_'+lang];
   for(const n of ['1.','2.','3.'])expect(feedback).toContain(n);
   expect(feedback).toContain('Apple');
  }
 });
 it('keeps ordered private guide headings and honest capacity for trainer observation',()=>{
  const c=j(leaf+'competency.json').observation_indicators;
  expect(c).toHaveLength(1);expect(c[0].objective_index).toBe(0);expect(Object.keys(c[0].levels)).toHaveLength(6);
  for(const lang of ['fil','en']){
   const g=fs.readFileSync(leaf+`facilitator.${lang}.md`,'utf8');
   expect([...g.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);
   expect(g).toContain('5 opening + 15 trainer modelling + 35 observed simulations/feedback/retry + 12 incident/near-miss debrief + 8 transfer = 75');
   expect(g).toContain('45 + 60 + 60 + 75 = 240');expect(g).toContain('27');expect(g).toContain('1:30 attempt, 0:30 feedback, 1:00 retry');
   const kit=fs.readFileSync(`docs/lesson-184-practice-kit.${lang}.md`,'utf8');expect([...kit.matchAll(/^## /gm)]).toHaveLength(5);
  }
 });
 it('preserves sibling teaching, source transcriptions, locks, shared UI and legacy summaries',()=>{
  for(const group of ['sibling_files_sha256','source_files_sha256','shared_files_sha256'])for(const[p,h]of Object.entries(baseline[group])){
   expect(sha(beforeProposed174(p)),p).toBe(h);
  }
 });
 it('selects matching current narration and the original recordings for old published text',()=>{
  const mf=j(base+'narration.json'),loaded=loadReferenceModule(base+'modules/08-osh','public').lessons.find(l=>l.manifest.lesson_key==='safety-demonstrate');
  const old=j('docs/lesson-184-handoff-baseline.json'),oldLesson=JSON.parse(old.target_files_utf8[leaf+'lesson.json']);
  const parsed=Object.fromEntries(['fil','en'].map(lang=>[lang,parseReferenceRead(old.target_files_utf8[leaf+`read.${lang}.md`])]));
  const oldSections=oldLesson.sections.map((s,i)=>({...s,heading_fil:parsed.fil[i].heading,heading_en:parsed.en[i].heading,body_fil:parsed.fil[i].body,body_en:parsed.en[i].body}));
  for(const lang of ['fil','en']){
   const current=narrationForLesson(mf,'safety-demonstrate',lang,loaded.revision.read_sections);expect(Object.keys(current)).toHaveLength(6);
   const historic=narrationForLesson(mf,'safety-demonstrate',lang,oldSections);for(const s of oldSections)expect(historic[s.id].src).toBe(old.target_narration.sections[s.id][lang].src);
  }
 });
 it('pins six distinct reference-matched illustrations as draft with exact content hashes',()=>{
  const hashes=[];for(const s of lesson.sections){const a=lesson.assets.find(a=>a.id===s.asset_ids[0]);expect(a.review_status).toBe('draft');expect(sha(fs.readFileSync('public'+a.path))).toBe(a.content_hash);hashes.push(a.content_hash);}
  expect(new Set(hashes).size).toBe(6);
 });
 it('retains every old target narration byte and does not substitute fabricated audio',()=>{
  for(const langs of Object.values(baseline.target_narration.sections))for(const t of Object.values(langs))expect(sha(fs.readFileSync('public'+t.src))).toBe(t.sha256);
  const manifest=j(base+'narration.json');
  if(JSON.stringify(manifest.lessons['safety-demonstrate'])!==JSON.stringify(baseline.target_narration))expect(manifest.history['safety-demonstrate']).toContainEqual(baseline.target_narration);
 });
});

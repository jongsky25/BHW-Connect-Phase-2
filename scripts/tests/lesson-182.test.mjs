// @vitest-environment node
import {describe,it,expect} from 'vitest';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {beforeProposed182} from '../lib/lesson-182-integration.mjs';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration} from '../lib/reference-narration.mjs';import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-controls/',j=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const b=j('docs/lesson-182-handoff-baseline.json'),lesson=j(leaf+'lesson.json'),slides=j(leaf+'slides.json');
const loaded=loadReferenceModule('content/training/day1-basic-competencies/modules/08-osh','public').lessons.find(l=>l.manifest.lesson_key==='safety-controls');
describe('Apple lesson 1.8.2 actual current source and historical byte preservation',()=>{
 it('keeps complete identity, objectives, anchor/concept/coverage obligations and original check',()=>{
  expect(lesson.manifest).toEqual(b.manifest);expect(lesson.coverage).toEqual(b.coverage);expect(lesson.sections.map(({id,concept_ids})=>({id,concept_ids}))).toEqual(b.anchors);expect(slides.map(({id,concept_ids})=>({id,concept_ids}))).toEqual(b.slide_anchors);
  for(const check of [lesson.sections.at(-1).check,slides.at(-1).check])for(const field of ['prompt_fil','prompt_en','options','correct_option_index'])expect(check[field]).toEqual(b.original_check[field]);
 });
 it('keeps full bilingual Read/Slides teaching and gates the conditional corrected ending in feedback',()=>{
  for(const lang of ['fil','en']){const read=parseReferenceRead(fs.readFileSync(leaf+'read.'+lang+'.md','utf8'));expect(read.map(s=>s.id)).toEqual(b.anchors.map(s=>s.id));for(const [i,s]of read.entries())expect(s.body).toBe(slides[i]['narration_'+lang]);expect(read.map(s=>s.body).join(' ')).not.toMatch(/\bAna\b|33 anyos/);
   const feedback=lesson.sections.at(-1).check['feedback_'+lang];for(const word of lang==='fil'?['Una:','Ikalawa:','Ikatlo:','kapag natiyak','mananatiling nakahinto']:['First:','Second:','Third:','only when','task stays paused'])expect(feedback).toContain(word);
  }
 });
 it('retains twelve private headings, one objective indicator and six bilingual rubric levels',()=>{
  for(const lang of ['fil','en']){const guide=fs.readFileSync(leaf+'facilitator.'+lang+'.md','utf8');expect([...guide.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);expect(guide).toContain('45 + 60 + 60 + 75 = 240');expect(guide).toContain('not observed');}
  const rubric=j(leaf+'competency.json').observation_indicators;expect(rubric).toHaveLength(1);expect(rubric[0].objective_index).toBe(0);expect(Object.keys(rubric[0].levels)).toHaveLength(6);
 });
 it('hash-checks every proposed successor before returning immutable predecessors',()=>{
  const receipt=j('docs/lesson-182-proposal-receipt.json');for(const[p,e]of Object.entries(receipt.changed_existing_files)){expect(sha(fs.readFileSync(p))).toBe(e.proposed_sha256);expect(sha(beforeProposed182(p))).toBe(e.predecessor_sha256);expect(()=>beforeProposed182(p,Buffer.from('unreviewed mutation'))).toThrow('Unpinned');}
 });
 it('selects all twelve actual current Kore tracks and the unchanged old published tracks',()=>{
  const manifest=j('content/training/day1-basic-competencies/narration.json');const plan=planReferenceNarration([{key:'08-osh',lessons:[loaded]}],manifest,p=>sha(fs.readFileSync('public'+p)));expect(plan).toHaveLength(12);for(const p of plan){expect(p.action).toBe('skip');expect(p.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');}
  const previous=JSON.parse(b.target_files_utf8[leaf+'lesson.json']);const reads=Object.fromEntries(['fil','en'].map(lang=>[lang,parseReferenceRead(b.target_files_utf8[leaf+'read.'+lang+'.md'])]));
  const sections=previous.sections.map((s,i)=>({...s,heading_fil:reads.fil[i].heading,heading_en:reads.en[i].heading,body_fil:reads.fil[i].body,body_en:reads.en[i].body}));
  for(const lang of ['fil','en']){const selected=narrationForLesson(manifest,'safety-controls',lang,sections);expect(Object.keys(selected)).toEqual(previous.sections.map(s=>s.id));for(const s of previous.sections)expect(selected[s.id].src).toBe(b.target_narration.sections[s.id][lang].src);}
 });
 it('appends exactly the two target story compositions without changing the predecessor registry',()=>{
  const path='remotion/src/Root.tsx',source=fs.readFileSync(path,'utf8');
  const stripped=source.replace(/^import \{SafetyControlsStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`safety-controls-[\s\S]+?      \)\)\}\n/,'');
  expect(stripped).toBe(beforeProposed182(path).toString());
  for(const id of ['SafetyControlsStoryFil','SafetyControlsStoryEn'])expect(source.match(new RegExp(id,'g'))).toHaveLength(1);
 });
 it('uses six distinct inspected scene bytes and preserves bilingual accessible descriptions',()=>{
  const art=lesson.assets.filter(a=>a.id.startsWith('apple-controls-'));expect(art).toHaveLength(6);expect(new Set(art.map(a=>a.content_hash)).size).toBe(6);
  for(const section of lesson.sections){expect(section.asset_ids).toEqual(['apple-controls-'+section.id]);const a=art.find(a=>a.id===section.asset_ids[0]);expect(sha(fs.readFileSync('public'+a.path))).toBe(a.content_hash);expect(a.review_status).toBe('draft');expect(a.alt_fil.length).toBeGreaterThan(30);expect(a.alt_en.length).toBeGreaterThan(30);}
 });

 it('keeps shared UI changes confined to target timing and picture-before-check behavior',()=>{
  const path='src/components/elearning/reference-lessons.tsx',source=fs.readFileSync(path,'utf8');
  const stripped=source.replace(/^  const controls(?:Revision|Tracks|Minutes)[^\n]*\n/gm,'')
   .replace(' || controlsRevision) && !storyLayout && figures',') && !storyLayout && figures')
   .replace(' && !controlsRevision && (revealSummary',' && (revealSummary')
   .replace(/\{controlsRevision \? \(controlsMinutes[\s\S]*?              \)\) : actionPlanRevision/, '{actionPlanRevision');
  expect(stripped).toBe(beforeProposed182(path).toString());
 });

});

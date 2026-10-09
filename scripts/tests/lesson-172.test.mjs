import {beforeLesson184} from '../lib/lesson-184-integration.mjs';
// @vitest-environment node
import {describe, it, expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadReferenceModule, parseReferenceRead, FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {beforeLesson172} from '../lib/lesson-172-integration.mjs';
import {planReferenceNarration} from '../lib/reference-narration.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
const leaf='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-causes/';
const json=p=>JSON.parse(beforeLesson184(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=json('docs/lesson-172-implementation-baseline.json');
const receipt=json('docs/lesson-172-proposal-receipt.json');
const lesson=json(leaf+'lesson.json');
const previous=JSON.parse(beforeLesson172(leaf+'lesson.json'));
describe('Carole lesson 1.7.2 scoped draft',()=>{
 it('retains lesson identity, objectives, original check and anchor/concept obligations',()=>{
  expect(lesson.manifest).toEqual(previous.manifest);
  expect(lesson.sections.map(s=>s.id)).toEqual(['whys','manual-example','rosario','verify-branch','practice','check']);
  for(const old of previous.sections)expect(lesson.sections.find(s=>s.id===old.id).concept_ids).toEqual(old.concept_ids);
  const current=lesson.sections.at(-1).check,old=previous.sections.at(-1).check;
  for(const key of ['prompt_fil','prompt_en','options','correct_option_index'])expect(current[key]).toEqual(old[key]);
  expect(current.correct_option_index).toBe(1);
  for(const language of ['fil','en']){
   const read=fs.readFileSync(leaf+'read.'+language+'.md','utf8');
   expect(read).not.toMatch(/Nestor|\b41\b/);
   expect(read).toContain('Carole');
   const guide=fs.readFileSync(leaf+'facilitator.'+language+'.md','utf8');
   expect([...guide.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);
   expect(guide).toContain('35 + 50 + 45 + 50 = 180');
  }
  const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/07-problema','public');
  const revision=lessons.find(l=>l.manifest.lesson_key==='problem-causes').revision;
  for(let i=0;i<6;i++)for(const lang of ['fil','en'])expect(revision.slides[i]['narration_'+lang]).toBe(revision.read_sections[i]['body_'+lang]);
  expect(json(leaf+'competency.json').observation_indicators).toHaveLength(1);
  const indicator=json(leaf+'competency.json').observation_indicators[0];
  expect(indicator.objective_index).toBe(0);expect(Object.keys(indicator.levels)).toHaveLength(6);
 });
 it('pins six distinct new illustrations to the inspected Carole reference',()=>{
  const provenance=json('docs/lesson-172-scene-provenance.json');
  expect(provenance.scenes).toHaveLength(6);
  expect(new Set(provenance.scenes.map(s=>s.sha256)).size).toBe(6);
  expect(sha(fs.readFileSync(provenance.reference))).toBe('6e2b1c5044d7b0cde3f893a8358c062c1689a4200ba0611203642cda57d1544c');
  for(const scene of provenance.scenes){
   expect(sha(fs.readFileSync('public'+scene.public_path))).toBe(scene.sha256);
   expect(lesson.sections.find(s=>s.id===scene.id).asset_ids).toContain('carole-causes-'+scene.id);
  }
 });
 it('protects every predecessor byte and rejects changed successors without a pinned receipt',()=>{
  const shared=new Set(['.github/workflows/ci.yml','.github/workflows/remotion.yml','src/components/elearning/reference-lessons.tsx','scripts/tests/lesson-171-release.test.mjs','scripts/tests/lesson-171.test.mjs','scripts/lib/lesson-171-integration.mjs','scripts/lib/lesson-165-integration.mjs','scripts/tests/lesson-165-integration.test.mjs','remotion/src/Root.tsx','content/training/day1-basic-competencies/narration.json']);
  for(const path of Object.keys(receipt.changed_existing_files))expect(path.startsWith(leaf)||shared.has(path),path).toBe(true);
  for(const [path,hash]of Object.entries(baseline.protected_files))expect(sha(beforeLesson172(path)),path).toBe(hash);
  for(const path of Object.keys(receipt.changed_existing_files))expect(()=>beforeLesson172(path,Buffer.from('unpinned mutation'))).toThrow('Unpinned');
 },30000);
 it('keeps old published text selecting its exact previous narration',()=>{
  const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/07-problema','public');
  const current=json('content/training/day1-basic-competencies/narration.json');
  // Build old section text from immutable UTF-8 receipts, never current draft text.
  const oldSections=previous.sections.map(s=>{
   const values={...s};
   for(const lang of ['fil','en']){
    const md=beforeLesson172(leaf+'read.'+lang+'.md').toString();
    const original=parseReferenceRead(md).find(section=>section.id===s.id);
    values['heading_'+lang]=original.heading;values['body_'+lang]=original.body;
   }
   return values;
  });
  for(const lang of ['fil','en']){
   const selected=narrationForLesson(current,'problem-causes',lang,oldSections);
   expect(Object.keys(selected)).toEqual(previous.sections.map(s=>s.id));
   for(const section of previous.sections)expect(selected[section.id].src).toBe(baseline.target_narration.sections[section.id][lang].src);
  }
  expect(lessons).toHaveLength(4);
 });
 it('preserves every sibling narration/history and appends the exact reviewed registry entries',()=>{
  const path='content/training/day1-basic-competencies/narration.json';
  const old=JSON.parse(beforeLesson172(path)),actual=json(path);
  for(const [key,selection]of Object.entries(old.lessons))if(key!=='problem-causes')expect(actual.lessons[key],key).toEqual(selection);
  for(const [key,history]of Object.entries(old.history??{}))if(key!=='problem-causes')expect(actual.history[key],key).toEqual(history);
  const registryPath='remotion/src/Root.tsx',source=beforeLesson184(registryPath).toString();
  expect(source).toContain('ProblemCausesStoryFil');
  {
   const restored=source.replace(/^import \{ProblemCausesStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`problem-causes-[\s\S]+?      \)\)\}\n/,'');
   expect(restored).toBe(beforeLesson172(registryPath).toString());
   expect(source.match(/ProblemCausesStoryFil/g)).toHaveLength(1);expect(source.match(/ProblemCausesStoryEn/g)).toHaveLength(1);
  }
 });
 it('requires all actual generated recordings to match current text and retain the old selection',()=>{
  const manifest=json('content/training/day1-basic-competencies/narration.json');
  // Before synthesis, the existing global freshness test still reports the pending target.
  // Once exported media exists, this additionally verifies target provider and retained selection.
  expect(lesson.assets.some(a=>a.id==='problem-causes-story')).toBe(true);
  const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/07-problema','public');
  const plan=planReferenceNarration([{key:'07-problema',lessons}],manifest,src=>sha(fs.readFileSync('public'+src)));
  expect(plan.filter(p=>p.lessonKey==='problem-causes').every(p=>p.action==='skip')).toBe(true);
  const target=plan.filter(p=>p.lessonKey==='problem-causes');expect(target).toHaveLength(12);
  expect(target.every(p=>p.voice==='gemini:gemini-3.8-flash-tts:Kore')).toBe(true);
  expect(manifest.history['problem-causes']).toContainEqual(baseline.target_narration);
  const story=lesson.assets.find(a=>a.id==='problem-causes-story');
  for(const lang of ['fil','en'])for(const media of [story.videos[lang],story.videos[lang].poster,story.videos[lang].captions])expect(sha(fs.readFileSync('public'+media.path))).toBe(media.content_hash);
 });

});

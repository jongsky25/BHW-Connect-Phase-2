import {reviewed192View} from '../lib/lesson-192-release-integration.mjs';
// @vitest-environment node
import {beforeLesson192} from '../lib/lesson-192-integration.mjs';
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
const base='content/training/day1-basic-competencies/',leaf=base+'modules/09-sustainable-practices/lessons/resources-safe-change/';
const j=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const frozen=j('docs/lesson-192-handoff-baseline.json'),lesson=JSON.parse(reviewed192View(leaf+'lesson.json')),slides=j(leaf+'slides.json');
const prior=JSON.parse(frozen.target_files_utf8[leaf+'lesson.json']);
const loaded=loadReferenceModule(base+'modules/09-sustainable-practices','public').lessons.find(l=>l.manifest.lesson_key==='resources-safe-change');
describe('lesson 1.9.2 safe-change preservation and review boundaries',()=>{
 it('rejects unpinned successors before exposing historical predecessor bytes',()=>{for(const[p,e]of Object.entries(j('docs/lesson-192-proposal-receipt.json').changed_existing_files)){expect(sha(beforeLesson192(p))).toBe(e.predecessor_sha256);expect(sha(beforeLesson192(p,Buffer.from(e.predecessor_utf8)))).toBe(e.predecessor_sha256);expect(()=>beforeLesson192(p,Buffer.from('mutation'))).toThrow('Unpinned')}});
 it('uses six distinct reference-generated draft scenes with exact content hashes',()=>{const hashes=lesson.sections.map(s=>{const a=lesson.assets.find(a=>a.id===s.asset_ids[0]);expect(a.review_status).toBe('draft');expect(sha(fs.readFileSync('public'+a.path))).toBe(a.content_hash);return a.content_hash});expect(new Set(hashes).size).toBe(6)});
 it('preserves manifest, six stable anchor/concept pairs, coverage and every original quiz fact',()=>{
  expect(lesson.manifest).toEqual(frozen.manifest);expect(lesson.coverage).toEqual(prior.coverage);
  expect(lesson.sections.map(s=>[s.id,s.concept_ids])).toEqual(prior.sections.map(s=>[s.id,s.concept_ids]));
  expect(slides.map(s=>s.id)).toEqual(prior.sections.map(s=>'slide-'+s.id));
  for(const s of prior.sections.filter(s=>s.check)){
   const current=lesson.sections.find(n=>n.id===s.id).check;
   for(const k of ['prompt_fil','prompt_en','options','correct_option_index'])expect(current[k]).toEqual(s.check[k]);
   expect(slides.find(n=>n.id==='slide-'+s.id).check).toEqual(current);
   for(const lang of ['fil','en'])for(const number of ['1.','2.','3.'])expect(current['feedback_'+lang]).toContain(number);
  }
 });
 it('pairs full Read teaching with Slides narration and keeps the corrected ending after the choice',()=>{
  for(const lang of ['fil','en']){
   const read=parseReferenceRead(fs.readFileSync(leaf+`read.${lang}.md`,'utf8'));
   read.forEach((s,i)=>{expect(slides[i]['narration_'+lang]).toBe(s.body);expect(slides[i]['display_'+lang].length).toBeLessThan(s.body.length);expect(s.body).not.toMatch(/Elena|38/)});
   expect(read[5].body).not.toMatch(/Charlaine submits|inihahain ni Charlaine/i);
   expect(lesson.sections[5].check['feedback_'+lang]).toContain('Charlaine');
  }
 });
 it('keeps the twelve ordered guide sections, 60-minute allocation and bounded trainer capacity',()=>{
  expect(j(leaf+'competency.json')).toEqual(frozen.original_competency);
  for(const lang of ['fil','en']){
   const guide=fs.readFileSync(leaf+`facilitator.${lang}.md`,'utf8');
   expect([...guide.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);
   expect(guide).toContain('5 opening + 12 modelling + 25 practice/feedback/retry + 10 safeguards debrief + 8 transfer = 60');
   for(const text of ['T1-A','T2-B','T3-C','27','60 + 60 + 60 = 180'])expect(guide).toContain(text);
   expect([...fs.readFileSync(`docs/lesson-192-practice-kit.${lang}.md`,'utf8').matchAll(/^## /gm)]).toHaveLength(5);
  }
 });
 it('selects the exact original narration for original published teaching without changing historical bytes',()=>{
  const mf=j(base+'narration.json');
  const parsed=Object.fromEntries(['fil','en'].map(lang=>[lang,parseReferenceRead(frozen.target_files_utf8[leaf+`read.${lang}.md`])]));
  const sections=prior.sections.map((s,i)=>({...s,heading_fil:parsed.fil[i].heading,heading_en:parsed.en[i].heading,body_fil:parsed.fil[i].body,body_en:parsed.en[i].body}));
  for(const lang of ['fil','en']){
   const old=narrationForLesson(mf,'resources-safe-change',lang,sections);
   for(const s of sections){const t=frozen.target_narration.sections[s.id][lang];expect(old[s.id].src).toBe(t.src);expect(sha(fs.readFileSync('public'+t.src))).toBe(t.sha256)}
   const current=narrationForLesson(mf,'resources-safe-change',lang,loaded.revision.read_sections);
   expect(Object.keys(current)).toHaveLength(6);
   for(const [id,t] of Object.entries(current)){
    expect(t.src).toBe(mf.lessons['resources-safe-change'].sections[id][lang].src);
    expect(mf.lessons['resources-safe-change'].sections[id][lang].voice).toContain('Kore');
   }
  }
 });
});

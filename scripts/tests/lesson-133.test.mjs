// @vitest-environment node
import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration,referencedSources} from '../lib/reference-narration.mjs';
import {BHS_DECLINE_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {BHS_DECLINE_BEATS} from '../../remotion/src/bhs-decline/narration.ts';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {lessonPosition,continueLesson} from '../../src/lib/elearning/reference-navigation.ts';
import {toWebVtt} from '../lib/webvtt.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const folder=path.join(root,'content/training/day1-basic-competencies/modules/03-polisiya-bhs');
const dir=path.join(folder,'lessons/bhs-decline');
const json=p=>JSON.parse(readFileSync(path.join(root,p),'utf8'));
const source=JSON.parse(readFileSync(path.join(dir,'lesson.json'),'utf8'));
const authored=loadReferenceModule(folder,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='bhs-decline');
const modules=[{key:'03-polisiya-bhs',lessons:[authored]}];
const ids=['section-4','match-policy','hold-boundary','report-facts','section-7','refusal-check'];
const sha=src=>createHash('sha256').update(readFileSync(path.join(root,'public',src.slice(1)))).digest('hex');
describe('lesson 1.3.3 respectful refusal',()=>{
 it('preserves immutable metadata, original IDs and resume/completion identity',()=>{
  expect(source.manifest).toEqual({lesson_key:'bhs-decline',position:2,title_fil:'Magalang na pagtanggi',title_en:'Declining respectfully',objectives_fil:['Maipaliwanag at mailapat sa isang sitwasyon: magalang na pagtanggi.'],objectives_en:['Explain and apply in a situation: declining respectfully.'],required:true});
  expect(source.sections.map(s=>s.id)).toEqual(ids);
  expect(authored.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
  const lesson={...authored.manifest,id:'986cf9f0-bea2-4ff6-91b4-bfdb0bfca86e',revision:{...authored.revision,id:'new-revision'}};
  for(const [modality,position_key] of [['read','section-7'],['slides','slide-section-7']]){
   const saved={lesson_id:lesson.id,revision_id:'old-revision',modality,position_key,concept_id:'m3.competency',updated_at:'2026-10-04'};
   expect(lessonPosition(lesson,modality,saved).id).toBe(position_key);
   expect(continueLesson([lesson],[],[saved])).toBe(lesson);
   expect(continueLesson([lesson],[{lesson_id:lesson.id,revision_id:'old-revision'}],[saved])).toBeNull();
   expect(saved.revision_id).toBe('old-revision');
  }
 });
 it('aligns bilingual Read/Slides, policy coverage and meaningful application alternatives',()=>{
  for(const lang of ['fil','en']){
   const sections=parseReferenceRead(readFileSync(path.join(dir,`read.${lang}.md`),'utf8'));
   expect(sections.map(s=>s.id)).toEqual(ids);
   sections.forEach((s,i)=>expect(authored.revision.slides[i][`narration_${lang}`]).toBe(s.body));
   expect(sections[0].body).toContain('Mimi');
   expect(sections.map(s=>s.body).join(' ')).not.toMatch(/Corazon|Vlanche|Ernesto|YAKAP|audit pending/);
  }
  expect(source.coverage[0].id).toBe('m3.competency');
  expect(source.coverage[0].read_ids).toEqual(ids);
  expect(source.coverage[0].slide_ids).toEqual(ids.map(id=>'slide-'+id));
  for(const id of source.coverage[0].source_ids)expect(source.sources.some(s=>s.id===id)).toBe(true);
  const check=source.sections.at(-1).check;
  expect(check.options).toHaveLength(3);
  expect(check.correct_option_index).toBe(0);
  expect(check.feedback_en).toMatch(/wrong basis.*Moving outside.*Report facts/);
  expect(authored.revision.read_sections.find(s=>s.id==='section-7').body_en).toMatch(/same infant-formula offer/);
  expect(authored.revision.read_sections.find(s=>s.id==='match-policy').body_en).toMatch(/Different products.*licensed physicians and dentists.*under conditions.*cannot make prohibited promotion lawful/s);
 });
 it('uses dedicated Gemini style for defaults, copy edits and style invalidation',()=>{
  const plan=planReferenceNarration(modules,{lessons:{}},()=>null);
  expect(plan).toHaveLength(12);
  plan.forEach(i=>{expect(i.provider).toBe('gemini');expect(i.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(i.speechStyle).toBe(BHS_DECLINE_STORY_STYLES[i.language]);});
  const altered=structuredClone(modules);altered[0].lessons[0].revision.read_sections[2].body_en+=' State the boundary again.';
  const changed=planReferenceNarration(altered,{lessons:{}},()=>null);
  expect(changed.filter((i,k)=>i.contentHash!==plan[k].contentHash).map(i=>`${i.sectionId}/${i.language}`)).toEqual(['hold-boundary/en']);
  const original=BHS_DECLINE_STORY_STYLES.en;
  try{BHS_DECLINE_STORY_STYLES.en+=' Pause before refusing.';const styled=planReferenceNarration(modules,{lessons:{}},()=>null);expect(styled.filter((i,k)=>i.contentHash!==plan[k].contentHash)).toHaveLength(6);}finally{BHS_DECLINE_STORY_STYLES.en=original;}
 });
 it('selects all twelve exact-text current tracks and retains historical published audio',()=>{
  const manifest=json('content/training/day1-basic-competencies/narration.json');
  for(const options of [{},{provider:'gemini'}]){
   const plan=planReferenceNarration(modules,manifest,sha,options);
   expect(plan).toHaveLength(12);
   plan.forEach(i=>{expect(i.action).toBe('skip');expect(i.existing.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(i.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(i.zones);});
  }
  const old=json('scripts/tests/fixtures/lesson-131-published-siblings.json').find(l=>l.lesson_key==='bhs-decline');
  for(const lang of ['fil','en']){
   const previous=narrationForLesson(manifest,'bhs-decline',lang,old.read_sections);
   old.read_sections.forEach(s=>expect(previous[s.id].src).toBe(manifest.history['bhs-decline'][0].sections[s.id][lang].src));
   const current=narrationForLesson(manifest,'bhs-decline',lang,authored.revision.read_sections);
   ids.forEach(id=>expect(current[id].src).toBe(manifest.lessons['bhs-decline'].sections[id][lang].src));
  }
  const keep=referencedSources(manifest);
  for(const versions of Object.values(manifest.history))for(const version of versions)for(const tracks of Object.values(version.sections))for(const t of Object.values(tracks)){expect(keep.has(t.src)).toBe(true);expect(sha(t.src)).toBe(t.sha256);}
 });
 it('ships measured bilingual Gemini stories with script/VTT/hash parity and draft review status',()=>{
  const story=source.assets.find(a=>a.id===source.featured_asset_id);
  expect(story.id).toBe('bhs-decline-story');
  for(const asset of source.assets){expect(['draft','approved']).toContain(asset.review_status);expect(sha(asset.path)).toBe(asset.content_hash);}
  for(const lang of ['fil','en']){
   const t=json(`remotion/public/bhs-decline/narration-${lang}.json`);
   expect(t.provider).toBe('gemini');expect(t.model).toBe('gemini-3.8-flash-tts');expect(t.voice).toBe('Kore');
   expect(t.durationSeconds).toBeGreaterThan(45);expect(t.durationSeconds).toBeLessThan(89);
   expect(t.beats.map(b=>b.text)).toEqual(BHS_DECLINE_BEATS.map(b=>b[lang]));
   expect(t.beats.every(b=>b.end_ms>b.start_ms)).toBe(true);
   for(const m of [story.videos[lang],story.videos[lang].captions])expect(sha(m.path)).toBe(m.content_hash);
   expect(readFileSync(path.join(root,'public',story.videos[lang].captions.path.slice(1)),'utf8')).toBe(toWebVtt(t));
  }
 });
 it('provides the fixed facilitator outline and three observable refusal actions under objective zero',()=>{
  for(const lang of ['fil','en'])expect(parseReferenceRead(readFileSync(path.join(dir,`facilitator.${lang}.md`),'utf8')).map(s=>s.id)).toEqual(FACILITATOR_SECTION_IDS);
  const indicator=JSON.parse(readFileSync(path.join(dir,'competency.json'),'utf8')).observation_indicators[0];
  expect(indicator.objective_index).toBe(0);
  expect(indicator.observable_en).toMatch(/1\..*refusal|1\..*respectful/);
  expect(indicator.observable_en).toMatch(/2\..*reason.*3\..*handover/);
  expect(indicator.levels.kaya_na_en).toContain('all three');
 });
});

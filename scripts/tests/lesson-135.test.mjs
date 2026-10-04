// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration,mp3AudioFrames} from '../lib/reference-narration.mjs';
import {BHS_IMPROVEMENT_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {BHS_IMPROVEMENT_BEATS} from '../../remotion/src/bhs-improvement/narration.ts';
import {lessonPosition,continueLesson} from '../../src/lib/elearning/reference-navigation.ts';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {toWebVtt} from '../lib/webvtt.mjs';
const root=path.resolve(import.meta.dirname,'../..'),dir=path.join(root,'content/training/day1-basic-competencies/modules/03-polisiya-bhs');
const lessonDir=path.join(dir,'lessons/bhs-improvement');
const json=p=>JSON.parse(readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=src=>readFileSync(path.join(root,'public',src.slice(1))),fileHash=src=>sha(bytes(src));
const source=json(path.join(lessonDir,'lesson.json')),manifest=json(path.join(root,'content/training/day1-basic-competencies/narration.json'));
const authored=loadReferenceModule(dir,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='bhs-improvement');
const modules=[{key:'03-polisiya-bhs',lessons:[authored]}];
const ids=['section-6','factual-concern','one-feasible-proposal','reason-service-checks','responsibility-followup','proposal-check'];
describe('lesson 1.3.5 one workable proposal',()=>{
 it('preserves immutable identity, six stable IDs and complete bilingual parity',()=>{
  expect(source.manifest).toEqual({lesson_key:'bhs-improvement',position:4,title_fil:'Isang mungkahing maisasagawa',title_en:'One workable suggestion',objectives_fil:['Maipaliwanag at mailapat sa isang sitwasyon: isang mungkahing maisasagawa.'],objectives_en:['Explain and apply in a situation: one workable suggestion.'],required:true});
  expect(source.sections.map(s=>s.id)).toEqual(ids);expect(authored.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
  expect(source.coverage).toEqual([{id:'m3.competency',read_ids:ids,slide_ids:ids.map(id=>'slide-'+id),source_ids:['m3.competency-source']}]);
  for(const lang of ['fil','en']){
   const read=parseReferenceRead(readFileSync(path.join(lessonDir,`read.${lang}.md`),'utf8'));expect(read.map(s=>s.id)).toEqual(ids);
   for(const [i,s] of read.entries())expect(authored.revision.slides[i][`narration_${lang}`]).toBe(s.body);
   expect(read[0].body).toContain('Mimi');expect(read.map(s=>s.body).join(' ')).not.toMatch(/Corazon|Riza|Vlanche|YAKAP|2021-0486/);
  }
  expect(source.sections.at(-1).check).toEqual(authored.revision.slides.at(-1).check);expect(source.sections.at(-1).check.options).toHaveLength(3);
 });
 it('keeps old-ID resume meaningful and completed lesson UUID unchanged',()=>{
  const lesson={...authored.manifest,id:'83ae2910-d953-4ce1-a2da-c47dd838920a',revision:{...authored.revision,id:'new-draft'}};
  for(const mode of ['read','slides']){const position=mode==='read'?'section-6':'slide-section-6';expect(lessonPosition(lesson,mode,{lesson_id:lesson.id,revision_id:'old-published',position_key:position,concept_id:'m3.competency',modality:mode}).id).toBe(position);}
  expect(continueLesson([lesson],[{lesson_id:lesson.id}],[])).toBeNull();
 });
 it('teaches one proposal, explicit service/authority checks and agreed review rather than implementation',()=>{
  const sections=authored.revision.read_sections;
  expect(sections.find(s=>s.id==='factual-concern').body_en).toContain('savings amounts that have not been measured');
  expect(sections.find(s=>s.id==='one-feasible-proposal').body_en).toContain('Check for an existing process');
  expect(sections.find(s=>s.id==='reason-service-checks').body_en).toContain('protect service and safety');
  expect(sections.find(s=>s.id==='responsibility-followup').body_en).toContain('does not implement a new checklist yet');
  const check=source.sections.at(-1).check;expect(check.correct_option_index).toBe(0);
  expect(check.feedback_en).toMatch(/First:.*Second:.*Third:/);expect(check.feedback_fil).toMatch(/Una:.*Ikalawa:.*Ikatlo:/);
  expect(source.sources[0].pdf_pages).toEqual([24]);expect(source.assets.some(a=>a.id==='practice-map')).toBe(false);
 });
 it('selects Gemini by default and invalidates cache after text or style changes',()=>{
  const fresh=planReferenceNarration(modules,{lessons:{}},()=>null);expect(fresh).toHaveLength(12);
  expect(fresh.every(i=>i.provider==='gemini'&&i.speechStyle===BHS_IMPROVEMENT_STORY_STYLES[i.language])).toBe(true);
  const changed=structuredClone(modules);changed[0].lessons[0].revision.read_sections[0].body_en+=' Confirm the follow-up.';
  expect(planReferenceNarration(changed,manifest,fileHash).find(i=>i.sectionId==='section-6'&&i.language==='en').action).toBe('render');
  const old=BHS_IMPROVEMENT_STORY_STYLES.en;
  try{BHS_IMPROVEMENT_STORY_STYLES.en+=' Pause before the proposal.';expect(planReferenceNarration(modules,manifest,fileHash).find(i=>i.language==='en').action).toBe('render');}finally{BHS_IMPROVEMENT_STORY_STYLES.en=old;}
 });
 it('has twelve actual current Kore tracks with exact frame timings under explicit and default plans',()=>{
  for(const options of [{},{provider:'gemini'}]){
   const plan=planReferenceNarration(modules,manifest,fileHash,options);expect(plan).toHaveLength(12);
   for(const i of plan){expect(i.action).toBe('skip');expect(i.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(i.speechStyle).toBe(BHS_IMPROVEMENT_STORY_STYLES[i.language]);expect(i.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(i.zones);
    const frames=mp3AudioFrames(bytes(i.src)),duration=frames.reduce((n,f)=>n+f.samples/f.sampleRate,0);expect(i.existing.duration_seconds).toBeCloseTo(duration,3);for(const t of i.existing.timings)expect(t.end_ms).toBeGreaterThan(t.start_ms);expect(i.existing.timings.at(-1).end_ms).toBeLessThanOrEqual(duration*1000+1);
   }
  }
 });
 it('retains old published exact-text history and all tracked sibling media',()=>{
  const baseline=json(path.join(root,'docs/lesson-135-narration-baseline.json'));
  for(const [key,hash] of Object.entries(baseline.sibling_mapping_hashes))expect(sha(JSON.stringify(manifest.lessons[key]))).toBe(hash);
  expect(manifest.history['bhs-improvement'].some(h=>JSON.stringify(h)===JSON.stringify(baseline.target))).toBe(true);
  for(const lang of ['fil','en']){
   const old=baseline.target.sections['section-6'][lang];
   const section={id:'section-6',[`heading_${lang}`]:old.timings.filter(t=>t.zone==='heading').map(t=>t.text).join(' '),[`body_${lang}`]:old.timings.filter(t=>t.zone==='body').map(t=>t.text).join(' '),[`takeaway_${lang}`]:old.timings.filter(t=>t.zone==='takeaway').map(t=>t.text).join(' ')};
   expect(narrationForLesson(manifest,'bhs-improvement',lang,[section])['section-6'].src).toBe(old.src);
   const current=narrationForLesson(manifest,'bhs-improvement',lang,authored.revision.read_sections);expect(Object.keys(current)).toEqual(ids);
  }
  for(const [src,hash] of Object.entries(baseline.historical_target_hashes))expect(fileHash(src)).toBe(hash);
 });
 it('uses new original draft art with exact prompt/reference and matching animation bytes',()=>{
  const art=source.assets.find(a=>a.id==='mimi-workable-suggestion');expect(fileHash(art.path)).toBe(art.content_hash);expect(sha(readFileSync(path.join(root,'remotion/public/bhs-improvement/scene.png')))).toBe(art.content_hash);expect(art.review_status).toBe('draft');expect(art.provenance).toContain('Exact prompt:');expect(art.path).not.toContain('resource-use');for(const s of source.sections)expect(s.asset_ids).toContain(art.id);
 });
 it('has two measured six-beat stories with exact media hashes and VTT text/timing',()=>{
  const asset=source.assets.find(a=>a.id===source.featured_asset_id);expect(asset).toBeDefined();expect(asset.review_status).toBe('draft');expect(fileHash(asset.path)).toBe(asset.content_hash);
  for(const lang of ['fil','en']){const v=asset.videos[lang];expect(fileHash(v.path)).toBe(v.content_hash);expect(fileHash(v.poster.path)).toBe(v.poster.content_hash);expect(fileHash(v.captions.path)).toBe(v.captions.content_hash);
   const t=json(path.join(root,`remotion/public/bhs-improvement/narration-${lang}.json`));expect(t).toMatchObject({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore'});expect(t.beats.map(b=>b.zone)).toEqual(BHS_IMPROVEMENT_BEATS.map(b=>b.id));expect(t.beats.map(b=>b.text)).toEqual(BHS_IMPROVEMENT_BEATS.map(b=>b[lang]));expect(bytes(v.captions.path).toString('utf8').replaceAll('\r','')).toBe(toWebVtt(t));expect(v.duration_s).toBeGreaterThan(t.durationSeconds);expect(v.duration_s).toBeLessThanOrEqual(90);
  }
 });
 it('has twelve bilingual facilitator headings and one observation indicator with supported re-practice',()=>{
  for(const lang of ['fil','en']){const notes=readFileSync(path.join(lessonDir,`facilitator.${lang}.md`),'utf8');expect([...notes.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);expect(notes).toContain('Card A');expect(notes).toContain('Card B');expect(notes).toContain('40');expect(notes).toContain('follow-up');}
  expect(authored.notes.observation_indicators).toHaveLength(1);const i=authored.notes.observation_indicators[0];expect(i.objective_index).toBe(0);expect(i.not_yet_en).toContain('Implements before permission');expect(Object.keys(i.levels)).toHaveLength(6);
 });
});

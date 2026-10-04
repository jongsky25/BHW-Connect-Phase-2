// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration,mp3AudioFrames} from '../lib/reference-narration.mjs';
import {BHS_RESOURCES_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {BHS_RESOURCES_BEATS} from '../../remotion/src/bhs-resources/narration.ts';
import {lessonPosition,continueLesson} from '../../src/lib/elearning/reference-navigation.ts';
import {toWebVtt} from '../lib/webvtt.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const dir=path.join(root,'content/training/day1-basic-competencies/modules/03-polisiya-bhs');
const lessonDir=path.join(dir,'lessons/bhs-resources');
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=src=>readFileSync(path.join(root,'public',src.slice(1)));
const fileHash=src=>sha(bytes(src));
const source=json(path.join(lessonDir,'lesson.json'));
const manifest=json(path.join(root,'content/training/day1-basic-competencies/narration.json'));
const authored=loadReferenceModule(dir,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='bhs-resources');
const modules=[{key:'03-polisiya-bhs',lessons:[authored]}];
const ids=['section-5','know-responsibilities','observe-resource-use','protect-service','check-before-change','resource-check'];
describe('lesson 1.3.4 checks before changing resource use',()=>{
 it('preserves immutable identity and both concepts with bilingual Read/Slides parity',()=>{
  expect(source.manifest).toEqual({lesson_key:'bhs-resources',position:3,title_fil:'Polisiya at paggamit ng rekurso',title_en:'Policies and resource use',objectives_fil:['Maipaliwanag at mailapat sa isang sitwasyon: polisiya at paggamit ng rekurso.'],objectives_en:['Explain and apply in a situation: policies and resource use.'],required:true});
  expect(source.sections.map(s=>s.id)).toEqual(ids);
  expect(authored.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
  expect(source.coverage.map(c=>c.id)).toEqual(['m3.other-topics','m3.competency']);
  for(const lang of ['fil','en']){
   const read=parseReferenceRead(readFileSync(path.join(lessonDir,`read.${lang}.md`),'utf8'));
   expect(read.map(s=>s.id)).toEqual(ids);
   for(const [i,s] of read.entries())expect(authored.revision.slides[i][`narration_${lang}`]).toBe(s.body);
   expect(read[0].body).toContain('Mimi');
   expect(read.map(s=>s.body).join(' ')).not.toMatch(/Corazon|Riza|Vlanche|Ernesto|YAKAP|Declining the offer to Mimi|Ang pagtanggi kay Mimi/);
  }
  expect(source.sections.at(-1).check).toEqual(authored.revision.slides.at(-1).check);
  expect(source.sections.at(-1).check.options).toHaveLength(3);
 });
 it('retains original resume IDs for a changed revision and completed lesson UUID',()=>{
  const lesson={...authored.manifest,id:'39ab9754-1714-4126-a83e-6f9185e6e39b',revision:{...authored.revision,id:'new-revision'}};
  for(const mode of ['read','slides'])for(const concept of ['m3.other-topics','m3.competency']){
   const position=mode==='read'?'section-5':'slide-section-5';
   expect(lessonPosition(lesson,mode,{lesson_id:lesson.id,revision_id:'old-revision',position_key:position,concept_id:concept,modality:mode}).id).toBe(position);
  }
  expect(continueLesson([lesson],[{lesson_id:lesson.id}],[{lesson_id:lesson.id,updated_at:'2026-10-04'}])).toBeNull();
 });
 it('requires facts, policy and service checks rather than independent cuts or retrospective reporting',()=>{
  const read=authored.revision.read_sections;
  expect(read.find(s=>s.id==='observe-resource-use').body_en).toMatch(/guesses about motives.*invented consumption/s);
  expect(read.find(s=>s.id==='protect-service').body_en).toMatch(/does not repair electrical systems.*ration services/s);
  expect(read.find(s=>s.id==='check-before-change').body_en).toContain('review the schedule and existing checklist');
  const check=source.sections.at(-1).check;
  expect(check.correct_option_index).toBe(0);
  expect(check.feedback_en).toContain('reporting afterwards is insufficient');
  expect(check.feedback_en).toContain('reduces available supplies before authorization');
  expect(source.sources.every(s=>s.pdf_pages[0]===24&&!s.title.includes('pending'))).toBe(true);
 });
 it('uses Gemini for new screens and invalidates after copy and style edits',()=>{
  const fresh=planReferenceNarration(modules,{lessons:{}},()=>null);
  expect(fresh).toHaveLength(12);
  expect(fresh.every(i=>i.provider==='gemini'&&i.speechStyle===BHS_RESOURCES_STORY_STYLES[i.language])).toBe(true);
  const changed=structuredClone(modules);changed[0].lessons[0].revision.read_sections[0].body_en+=' Confirm the closing rule.';
  const edited=planReferenceNarration(changed,manifest,fileHash).find(i=>i.sectionId==='section-5'&&i.language==='en');
  expect(edited.provider).toBe('gemini');expect(edited.action).toBe('render');
  const old=BHS_RESOURCES_STORY_STYLES.en;
  try{BHS_RESOURCES_STORY_STYLES.en+=' Pause before the question.';expect(planReferenceNarration(modules,manifest,fileHash).find(i=>i.language==='en').action).toBe('render');}
  finally{BHS_RESOURCES_STORY_STYLES.en=old;}
 });
 it('has twelve real current expressive Gemini tracks and both old exact-text recordings retained',()=>{
  for(const options of [{},{provider:'gemini'}]){
   const plan=planReferenceNarration(modules,manifest,fileHash,options);expect(plan).toHaveLength(12);
   for(const item of plan){
    expect(item.action).toBe('skip');expect(item.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(item.speechStyle).toContain('checking before action');
    expect(item.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(item.zones);
    const frames=mp3AudioFrames(bytes(item.src)),duration=frames.reduce((n,f)=>n+f.samples/f.sampleRate,0);
    expect(item.existing.duration_seconds).toBeCloseTo(duration,3);
    for(const t of item.existing.timings)expect(t.end_ms).toBeGreaterThan(t.start_ms);
    expect(item.existing.timings.at(-1).end_ms).toBeLessThanOrEqual(duration*1000+1);
   }
  }
  expect(fileHash('/training/audio/03-polisiya-bhs/bhs-resources/section-5.en.a29ef2d462eb.mp3')).toBe('66911b1d237ca50869654f5acdebe4e528a348e3a9b65a8ea94cd9c8a6638ab1');
  expect(fileHash('/training/audio/03-polisiya-bhs/bhs-resources/section-5.fil.5864011094dc.mp3')).toBe('e0764b36c79609619098c4f873a631576f8f97d4f9b5d95de01839f720000e53');
  expect(manifest.history['bhs-resources'].some(h=>h.sections['section-5']?.en?.src.endsWith('a29ef2d462eb.mp3'))).toBe(true);
 });
 it('integrates original owner-approved Mimi art with recorded provenance and matching animation bytes',()=>{
  const art=source.assets.find(a=>a.id==='mimi-resource-use');
  expect(fileHash(art.path)).toBe(art.content_hash);
  expect(sha(readFileSync(path.join(root,'remotion/public/bhs-resources/scene.png')))).toBe(art.content_hash);
  expect(art.provenance).toContain('Exact prompt:');expect(art.provenance).toContain('Approved 1.3.1');
  expect(art.review_status).toBe('approved');for(const s of source.sections)expect(s.asset_ids).toContain(art.id);
 });
 it('has measured bilingual story media with exact captions, posters and six distinct resource-use beats',()=>{
  const asset=source.assets.find(a=>a.id===source.featured_asset_id);expect(asset).toBeDefined();
  expect(fileHash(asset.path)).toBe(asset.content_hash);
  for(const lang of ['fil','en']){
   const video=asset.videos[lang];expect(fileHash(video.path)).toBe(video.content_hash);expect(fileHash(video.poster.path)).toBe(video.poster.content_hash);expect(fileHash(video.captions.path)).toBe(video.captions.content_hash);
   const timing=json(path.join(root,`remotion/public/bhs-resources/narration-${lang}.json`));
   expect(timing).toMatchObject({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore'});
   expect(timing.beats.map(b=>b.zone)).toEqual(BHS_RESOURCES_BEATS.map(b=>b.id));expect(timing.beats.map(b=>b.text)).toEqual(BHS_RESOURCES_BEATS.map(b=>b[lang]));
   expect(bytes(video.captions.path).toString('utf8').replaceAll('\r','')).toBe(toWebVtt(timing));expect(video.duration_s).toBeGreaterThan(timing.durationSeconds);expect(video.duration_s).toBeLessThanOrEqual(90);
  }
 });
 it('uses twelve facilitation headings, both card rationales and three actions in one objective',()=>{
  for(const lang of ['fil','en']){
   const notes=readFileSync(path.join(lessonDir,`facilitator.${lang}.md`),'utf8');expect([...notes.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);expect(notes).toContain('Card A');expect(notes).toContain('Card B');expect(notes).toContain('40');
  }
  expect(authored.notes.observation_indicators).toHaveLength(1);expect(authored.notes.observation_indicators[0].objective_index).toBe(0);expect(authored.notes.observation_indicators[0].observable_en).toMatch(/\(1\).*\(2\).*\(3\)/);expect(authored.notes.observation_indicators[0].not_yet_en).toContain('sets supplies aside independently');
 });
});

// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration,mp3AudioFrames} from '../lib/reference-narration.mjs';
import {BHW_ELIGIBILITY_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {BHW_ELIGIBILITY_BEATS} from '../../remotion/src/bhw-eligibility/narration.ts';
import {lessonPosition,continueLesson} from '../../src/lib/elearning/reference-navigation.ts';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {toWebVtt} from '../lib/webvtt.mjs';
const root=path.resolve(import.meta.dirname,'../..'),dir=path.join(root,'content/training/day1-basic-competencies/modules/04-ra7883'),lessonDir=path.join(dir,'lessons/bhw-eligibility');
const json=p=>JSON.parse(readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=src=>readFileSync(path.join(root,'public',src.slice(1))),fileHash=src=>sha(bytes(src));
const source=json(path.join(lessonDir,'lesson.json')),manifest=json(path.join(root,'content/training/day1-basic-competencies/narration.json'));
const authored=loadReferenceModule(dir,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='bhw-eligibility'),modules=[{key:'04-ra7883',lessons:[authored]}];
const ids=["bhwe-question","section-4","service-count","evidence-and-scope","bhwe-verification","bhwe-application-check"];
describe('lesson 1.4.3 Demi BHWE conditions',()=>{
 it('preserves immutable single-objective manifest, old IDs and full bilingual narration parity',()=>{
  expect(source.manifest).toEqual({lesson_key:'bhw-eligibility',position:2,title_fil:'Pag-unawa sa BHWE',title_en:'Understanding BHWE',objectives_fil:['Maipaliwanag at mailapat sa isang sitwasyon: pag-unawa sa bhwe.'],objectives_en:['Explain and apply in a situation: understanding bhwe.'],required:true});
  expect(source.sections.map(s=>s.id)).toEqual(ids);expect(authored.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
  expect(source.coverage[0].id).toBe('m4.bhwe');expect(source.coverage[0].read_ids).toEqual(ids);expect(source.coverage[0].source_ids).toContain('m4.bhwe-source');
  for(const lang of ['fil','en']){const read=parseReferenceRead(readFileSync(path.join(lessonDir,`read.${lang}.md`),'utf8'));expect(read.map(s=>s.id)).toEqual(ids);for(const [i,s] of read.entries())expect(authored.revision.slides[i][`narration_${lang}`]).toBe(s.body);expect(read[0].body).toContain('Demi');expect(read.map(s=>s.body).join(' ')).not.toMatch(/Josie|Mimi|Corazon|Riza|Vlanche/);}
 });
 it('resumes the preserved BHWE section in both modes and preserves completion identity',()=>{
  const lesson={...authored.manifest,id:'f1f527f1-aec9-48a8-933b-79fecf63bfb4',revision:{...authored.revision,id:'new-draft'}};
  for(const mode of ['read','slides'])for(const id of ['section-4']){const position=mode==='read'?id:'slide-'+id;expect(lessonPosition(lesson,mode,{lesson_id:lesson.id,revision_id:'old-published',position_key:position,concept_id:'m4.bhwe',modality:mode}).id).toBe(position);}
  expect(continueLesson([lesson],[{lesson_id:lesson.id}],[])).toBeNull();
 });
 it('teaches the audited CSC conditions, service count and bounded verification',()=>{
  const sections=authored.revision.read_sections;
  expect(sections[1].body_en).toContain('two years of college education leading to a degree');
  expect(sections[1].body_en).toContain('continuous, active, full-time voluntary service');
  expect(sections[1].body_en).toContain('satisfactory service record');
  expect(sections[1].body_en).toContain('20 February 1995');
  expect(sections[2].body_en).toContain('only three under accredited status');
  expect(sections[2].body_en).toContain('not CSC approval');
  expect(sections[3].body_en).toContain('except honorarium throughout');
  expect(sections[3].body_en).toContain('government plantilla payroll');
  expect(sections[3].body_en).toContain('may still qualify');
  expect(sections[3].body_en).toContain('first-level positions with exceptions');
  expect(sections[4].body_en).toContain('takes effect on approval');
  const check=source.sections.at(-1).check;
  expect(check).toEqual(authored.revision.slides.at(-1).check);expect(check.options).toHaveLength(3);expect(check.correct_option_index).toBe(0);
  expect(check.feedback_en).toMatch(/First:.*Second:.*Third:/);expect(check.feedback_fil).toMatch(/Una:.*Ikalawa:.*Ikatlo:/);
  expect(source.sources.find(s=>s.id==='m4.bhwe-source').pdf_pages).toEqual([13]);
  expect(source.coverage.map(c=>c.id)).toEqual(['m4.bhwe']);
 });
 it('selects target-only Gemini styles by default and invalidates text/style cache',()=>{
  const fresh=planReferenceNarration(modules,{lessons:{}},()=>null);expect(fresh).toHaveLength(12);expect(fresh.every(i=>i.provider==='gemini'&&i.speechStyle===BHW_ELIGIBILITY_STORY_STYLES[i.language])).toBe(true);
  const changed=structuredClone(modules);changed[0].lessons[0].revision.read_sections[0].body_en+=' Verify evidence.';expect(planReferenceNarration(changed,manifest,fileHash).find(i=>i.sectionId==='bhwe-question'&&i.language==='en').action).toBe('render');
  const old=BHW_ELIGIBILITY_STORY_STYLES.en;try{BHW_ELIGIBILITY_STORY_STYLES.en+=' Pause before authority.';expect(planReferenceNarration(modules,manifest,fileHash).find(i=>i.language==='en').action).toBe('render');}finally{BHW_ELIGIBILITY_STORY_STYLES.en=old;}
 });
 it('has twelve actual encoded current Kore tracks and exact zone text under both cache plans',()=>{
  for(const options of [{},{provider:'gemini'}]){const plan=planReferenceNarration(modules,manifest,fileHash,options);expect(plan).toHaveLength(12);for(const i of plan){expect(i.action).toBe('skip');expect(i.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(i.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(i.zones);const frames=mp3AudioFrames(bytes(i.src)),duration=frames.reduce((n,f)=>n+f.samples/f.sampleRate,0);expect(i.existing.duration_seconds).toBeCloseTo(duration,3);for(const t of i.existing.timings)expect(t.end_ms).toBeGreaterThan(t.start_ms);expect(i.existing.timings.at(-1).end_ms).toBeLessThanOrEqual(duration*1000+1);}}
 });
 it('protects every non-target mapping and selects both historical exact-text sections',()=>{
  const baseline=json(path.join(root,'docs/lesson-143-narration-baseline.json'));for(const [key,hash] of Object.entries(baseline.sibling_mapping_hashes))expect(sha(JSON.stringify(manifest.lessons[key]))).toBe(hash);
  expect(manifest.history['bhw-eligibility'].some(h=>JSON.stringify(h)===JSON.stringify(baseline.target))).toBe(true);
  for(const lang of ['fil','en'])for(const id of ['section-4']){const old=baseline.target.sections[id][lang],section={id,[`heading_${lang}`]:old.timings.filter(t=>t.zone==='heading').map(t=>t.text).join(' '),[`body_${lang}`]:old.timings.filter(t=>t.zone==='body').map(t=>t.text).join(' '),[`takeaway_${lang}`]:old.timings.filter(t=>t.zone==='takeaway').map(t=>t.text).join(' ')};expect(narrationForLesson(manifest,'bhw-eligibility',lang,[section])[id].src).toBe(old.src);}
  for(const lang of ['fil','en'])expect(Object.keys(narrationForLesson(manifest,'bhw-eligibility',lang,authored.revision.read_sections))).toEqual(ids);for(const [src,hash] of Object.entries(baseline.all_original_track_hashes))expect(fileHash(src)).toBe(hash);
 });
 it('selects recovered original bytes for the actual unchanged published Read',()=>{
  const old=json(path.join(root,'docs/lesson-143-start-baseline.json')).published_rows.find(r=>r.lesson_key==='bhw-eligibility');
  const recovery=json(path.join(root,'docs/lesson-143-historical-audio-recovery.json'));
  expect(recovery.source_commit).toBe('1711c9a964ef1a0de610091021d9de99d59cf0b8');
  for(const lang of ['en','fil']){const selected=narrationForLesson(manifest,'bhw-eligibility',lang,old.read_sections);expect(Object.keys(selected)).toEqual(['section-4']);const restored=recovery.tracks.find(t=>t.language===lang);expect(selected['section-4'].src).toBe(restored.src);expect(fileHash(restored.src)).toBe(restored.sha256);}
 });
 it('preserves exact original draft art, input identity and prompt provenance',()=>{
  const art=source.assets.find(a=>a.id==='demi-bhwe-discussion');expect(fileHash(art.path)).toBe(art.content_hash);
  expect(sha(readFileSync(path.join(root,'remotion/public/bhw-eligibility/scene.png')))).toBe(art.content_hash);expect(art.review_status).toBe('approved');
  const p=json(path.join(root,'docs/lesson-143-art-provenance.json'));
  expect(p.reference_image.sha256).toBe('032a985f9c336b745a99d284e2143d7559f070f76f6e85e64dbdaf4c7f9a89b2');expect(sha(p.prompt)).toBe(p.prompt_sha256);const approval=json(path.join(root,'docs/lesson-143-owner-approval.json'));expect(approval.reviewed_head).toBe('d33b51734ae34398a91f79e99a9a1644399c55de');expect(approval.release_clarification).toBe('Merge, deploy, and publish');expect(approval.approved_asset_ids).toEqual(['demi-bhwe-discussion','bhw-eligibility-story']);expect(approval.approved_media).toHaveLength(19);for(const media of approval.approved_media)expect(fileHash(media.path)).toBe(media.sha256);
  for(const section of source.sections)expect(section.asset_ids).toContain(art.id);
 });
 it('has two measured six-beat stories with exact hashes and derived VTT captions',()=>{
  const asset=source.assets.find(a=>a.id===source.featured_asset_id);expect(asset).toBeDefined();expect(asset.review_status).toBe('approved');expect(fileHash(asset.path)).toBe(asset.content_hash);
  for(const lang of ['fil','en']){const v=asset.videos[lang];expect(fileHash(v.path)).toBe(v.content_hash);expect(fileHash(v.poster.path)).toBe(v.poster.content_hash);expect(fileHash(v.captions.path)).toBe(v.captions.content_hash);const t=json(path.join(root,`remotion/public/bhw-eligibility/narration-${lang}.json`));expect(t).toMatchObject({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore'});expect(t.beats.map(b=>b.zone)).toEqual(BHW_ELIGIBILITY_BEATS.map(b=>b.id));expect(t.beats.map(b=>b.text)).toEqual(BHW_ELIGIBILITY_BEATS.map(b=>b[lang]));expect(bytes(v.captions.path).toString('utf8').replaceAll('\r','')).toBe(toWebVtt(t));expect(v.duration_s).toBeGreaterThan(t.durationSeconds);expect(v.duration_s).toBeLessThanOrEqual(90);}
 });
 it('aligns twelve guide headings and one six-level observation indicator to three fictional practice cards',()=>{
  for(const lang of ['fil','en']){const notes=readFileSync(path.join(lessonDir,`facilitator.${lang}.md`),'utf8');expect([...notes.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);expect(notes).toContain('Card A');expect(notes).toContain('Card B');expect(notes).toContain('Card C');expect(notes).toContain('30');expect(notes).toContain('180');expect(notes).not.toMatch(/Josie|Mimi/);}
  expect(authored.notes.observation_indicators).toHaveLength(1);expect(authored.notes.observation_indicators[0].objective_index).toBe(0);expect(Object.keys(authored.notes.observation_indicators[0].levels)).toHaveLength(6);
 });
});

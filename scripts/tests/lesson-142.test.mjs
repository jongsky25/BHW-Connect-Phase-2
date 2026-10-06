// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration,mp3AudioFrames} from '../lib/reference-narration.mjs';
import {BHW_BENEFITS_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {BHW_BENEFITS_BEATS} from '../../remotion/src/bhw-benefits/narration.ts';
import {lessonPosition,continueLesson} from '../../src/lib/elearning/reference-navigation.ts';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {toWebVtt} from '../lib/webvtt.mjs';
const root=path.resolve(import.meta.dirname,'../..'),dir=path.join(root,'content/training/day1-basic-competencies/modules/04-ra7883'),lessonDir=path.join(dir,'lessons/bhw-benefits');
const json=p=>JSON.parse(readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=src=>readFileSync(path.join(root,'public',src.slice(1))),fileHash=src=>sha(bytes(src));
const source=json(path.join(lessonDir,'lesson.json')),manifest=json(path.join(root,'content/training/day1-basic-competencies/narration.json'));
const authored=loadReferenceModule(dir,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='bhw-benefits'),modules=[{key:'04-ra7883',lessons:[authored]}];
const ids=["benefits-question","section-3","registration-and-conditions","compare-allowances","benefit-verification","benefits-application-check"];
describe('lesson 1.4.2 Demi benefits and conditions',()=>{
 it('preserves immutable single-objective manifest, old IDs and full bilingual narration parity',()=>{
  expect(source.manifest).toEqual({lesson_key:'bhw-benefits',position:1,title_fil:'Benepisyo at mga kondisyon',title_en:'Benefits and conditions',objectives_fil:['Maipaliwanag at mailapat sa isang sitwasyon: benepisyo at mga kondisyon.'],objectives_en:['Explain and apply in a situation: benefits and conditions.'],required:true});
  expect(source.sections.map(s=>s.id)).toEqual(ids);expect(authored.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
  expect(source.coverage[0].id).toBe('m4.benefits');expect(source.coverage[0].read_ids).toEqual(ids);expect(source.coverage[0].source_ids).toContain('m4.benefits-source');
  for(const lang of ['fil','en']){const read=parseReferenceRead(readFileSync(path.join(lessonDir,`read.${lang}.md`),'utf8'));expect(read.map(s=>s.id)).toEqual(ids);for(const [i,s] of read.entries())expect(authored.revision.slides[i][`narration_${lang}`]).toBe(s.body);expect(read[0].body).toContain('Demi');expect(read.map(s=>s.body).join(' ')).not.toMatch(/Josie|Mimi|Corazon|Riza|Vlanche/);}
 });
 it('resumes the preserved benefits section in both modes and preserves completion identity',()=>{
  const lesson={...authored.manifest,id:'84abb8a8-9d6b-4e09-8936-998738d3ff37',revision:{...authored.revision,id:'new-draft'}};
  for(const mode of ['read','slides'])for(const id of ['section-3']){const position=mode==='read'?id:'slide-'+id;expect(lessonPosition(lesson,mode,{lesson_id:lesson.id,revision_id:'old-published',position_key:position,concept_id:'m4.benefits',modality:mode}).id).toBe(position);}
  expect(continueLesson([lesson],[{lesson_id:lesson.id}],[])).toBeNull();
 });
 it('distinguishes statutory benefit conditions, authorities and national cap without promises',()=>{
  const sections=authored.revision.read_sections;
  expect(sections[1].body_en).toContain('organized BHW groups');expect(sections[1].body_en).toContain('Public Attorney');expect(sections[1].body_en).toContain('one child');
  expect(sections[2].body_en).toContain('actively and regularly');expect(sections[2].body_en).toContain('nationwide');expect(sections[2].body_en).toContain('invent a barangay quota');expect(sections[2].body_en).toContain('does not prove');expect(sections[2].body_en).toContain('local health board review and approval');
  expect(sections[3].body_en).toContain('validated by the proper authorities');expect(sections[3].body_en).toContain('local peace and order council');expect(sections[3].body_en).toContain('any and all times');expect(sections[3].body_en).toContain('meals taken during duty');expect(sections[4].body_en).toContain('does not replace the statutory authorities');
  expect(sections.map(s=>s.body_en).join(' ')).not.toContain('registration is not simply given to anyone');
  const check=source.sections.at(-1).check;expect(check).toEqual(authored.revision.slides.at(-1).check);expect(check.options).toHaveLength(3);expect(check.correct_option_index).toBe(0);expect(check.feedback_en).toMatch(/First:.*Second:.*Third:/);expect(check.feedback_fil).toMatch(/Una:.*Ikalawa:.*Ikatlo:/);
  expect(source.sources[0].pdf_pages).toEqual([25,26]);expect(source.assets.some(a=>a.id==='practice-map')).toBe(false);expect(source.coverage.map(c=>c.id)).toEqual(['m4.benefits','m4.registration-requirement','m4.bhw-cap']);
 });
 it('selects target-only Gemini styles by default and invalidates text/style cache',()=>{
  const fresh=planReferenceNarration(modules,{lessons:{}},()=>null);expect(fresh).toHaveLength(12);expect(fresh.every(i=>i.provider==='gemini'&&i.speechStyle===BHW_BENEFITS_STORY_STYLES[i.language])).toBe(true);
  const changed=structuredClone(modules);changed[0].lessons[0].revision.read_sections[0].body_en+=' Verify evidence.';expect(planReferenceNarration(changed,manifest,fileHash).find(i=>i.sectionId==='benefits-question'&&i.language==='en').action).toBe('render');
  const old=BHW_BENEFITS_STORY_STYLES.en;try{BHW_BENEFITS_STORY_STYLES.en+=' Pause before authority.';expect(planReferenceNarration(modules,manifest,fileHash).find(i=>i.language==='en').action).toBe('render');}finally{BHW_BENEFITS_STORY_STYLES.en=old;}
 });
 it('has twelve actual encoded current Kore tracks and exact zone text under both cache plans',()=>{
  for(const options of [{},{provider:'gemini'}]){const plan=planReferenceNarration(modules,manifest,fileHash,options);expect(plan).toHaveLength(12);for(const i of plan){expect(i.action).toBe('skip');expect(i.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(i.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(i.zones);const frames=mp3AudioFrames(bytes(i.src)),duration=frames.reduce((n,f)=>n+f.samples/f.sampleRate,0);expect(i.existing.duration_seconds).toBeCloseTo(duration,3);for(const t of i.existing.timings)expect(t.end_ms).toBeGreaterThan(t.start_ms);expect(i.existing.timings.at(-1).end_ms).toBeLessThanOrEqual(duration*1000+1);}}
 });
 it('protects every non-target mapping and selects both historical exact-text sections',()=>{
  const baseline=json(path.join(root,'docs/lesson-142-narration-baseline.json'));for(const [key,hash] of Object.entries(baseline.sibling_mapping_hashes)){
    if(key==='bhw-eligibility'||key==='bhw-accreditation'||key==='bhw-follow-up'||key==='bhw-relationships'||key==='bhw-barangay-partners'){
      const retained=manifest.history[key].find(h=>sha(JSON.stringify(h))===hash);expect(retained).toBeDefined();
      for(const languages of Object.values(retained.sections))for(const track of Object.values(languages))expect(fileHash(track.src)).toBe(track.sha256);
    }else expect(sha(JSON.stringify(manifest.lessons[key]))).toBe(hash);
  }
  expect(manifest.history['bhw-benefits'].some(h=>JSON.stringify(h)===JSON.stringify(baseline.target))).toBe(true);
  for(const lang of ['fil','en'])for(const id of ['section-3']){const old=baseline.target.sections[id][lang],section={id,[`heading_${lang}`]:old.timings.filter(t=>t.zone==='heading').map(t=>t.text).join(' '),[`body_${lang}`]:old.timings.filter(t=>t.zone==='body').map(t=>t.text).join(' '),[`takeaway_${lang}`]:old.timings.filter(t=>t.zone==='takeaway').map(t=>t.text).join(' ')};expect(narrationForLesson(manifest,'bhw-benefits',lang,[section])[id].src).toBe(old.src);}
  for(const lang of ['fil','en'])expect(Object.keys(narrationForLesson(manifest,'bhw-benefits',lang,authored.revision.read_sections))).toEqual(ids);for(const [src,hash] of Object.entries(baseline.historical_target_hashes))expect(fileHash(src)).toBe(hash);
 });
 it('uses approved Demi art with exact reference and matching animation bytes',()=>{
  expect(json(path.join(root,'docs/lesson-142-media-generation.json')).owner_review).toBe('approved; exact reviewed hashes in lesson-142-owner-approval.json');
  const art=source.assets.find(a=>a.id==='demi-benefits-conditions');expect(fileHash(art.path)).toBe(art.content_hash);expect(sha(readFileSync(path.join(root,'remotion/public/bhw-benefits/scene.png')))).toBe(art.content_hash);expect(art.review_status).toBe('approved');expect(art.provenance).toContain('Exact prompt:');const approval=json(path.join(root,'docs/lesson-142-owner-approval.json'));expect(approval.authorization).toBe('1.4.2 is approved. merge and deploy');expect(approval.approved_asset_ids).toEqual(['demi-benefits-conditions','bhw-benefits-story']);expect(approval.approved_media).toHaveLength(19);for(const media of approval.approved_media)expect(fileHash(media.path)).toBe(media.sha256);
  const provenance=json(path.join(root,'docs/lesson-142-art-provenance.json'));expect(provenance.reference_image.sha256).toBe('032a985f9c336b745a99d284e2143d7559f070f76f6e85e64dbdaf4c7f9a89b2');expect(sha(provenance.prompt)).toBe(provenance.prompt_sha256);for(const section of source.sections)expect(section.asset_ids).toContain(art.id);
 });
 it('has two measured six-beat stories with exact hashes and derived VTT captions',()=>{
  const asset=source.assets.find(a=>a.id===source.featured_asset_id);expect(asset).toBeDefined();expect(asset.review_status).toBe('approved');expect(fileHash(asset.path)).toBe(asset.content_hash);
  for(const lang of ['fil','en']){const v=asset.videos[lang];expect(fileHash(v.path)).toBe(v.content_hash);expect(fileHash(v.poster.path)).toBe(v.poster.content_hash);expect(fileHash(v.captions.path)).toBe(v.captions.content_hash);const t=json(path.join(root,`remotion/public/bhw-benefits/narration-${lang}.json`));expect(t).toMatchObject({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore'});expect(t.beats.map(b=>b.zone)).toEqual(BHW_BENEFITS_BEATS.map(b=>b.id));expect(t.beats.map(b=>b.text)).toEqual(BHW_BENEFITS_BEATS.map(b=>b[lang]));expect(bytes(v.captions.path).toString('utf8').replaceAll('\r','')).toBe(toWebVtt(t));expect(v.duration_s).toBeGreaterThan(t.durationSeconds);expect(v.duration_s).toBeLessThanOrEqual(90);}
 });
 it('aligns twelve guide headings and one six-level observation indicator to both practice cases',()=>{
  for(const lang of ['fil','en']){const notes=readFileSync(path.join(lessonDir,`facilitator.${lang}.md`),'utf8');expect([...notes.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);expect(notes).toContain('Card A');expect(notes).toContain('Card B');expect(notes).toContain('30');expect(notes).toContain('180');expect(notes).toContain('25');expect(notes).not.toMatch(/Josie|Mimi/);}
  expect(authored.notes.observation_indicators).toHaveLength(1);expect(authored.notes.observation_indicators[0].objective_index).toBe(0);expect(Object.keys(authored.notes.observation_indicators[0].levels)).toHaveLength(6);
 });
});

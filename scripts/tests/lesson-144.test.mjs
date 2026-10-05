// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration,mp3AudioFrames} from '../lib/reference-narration.mjs';
import {BHW_ACCREDITATION_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {BHW_ACCREDITATION_BEATS} from '../../remotion/src/bhw-accreditation/narration.ts';
import {lessonPosition,continueLesson} from '../../src/lib/elearning/reference-navigation.ts';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {toWebVtt} from '../lib/webvtt.mjs';
const root=path.resolve(import.meta.dirname,'../..'),dir=path.join(root,'content/training/day1-basic-competencies/modules/04-ra7883'),leaf=path.join(dir,'lessons/bhw-accreditation');
const json=p=>JSON.parse(readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=src=>readFileSync(path.join(root,'public',src.slice(1))),fileHash=src=>sha(bytes(src));
const source=json(path.join(leaf,'lesson.json')),manifest=json(path.join(root,'content/training/day1-basic-competencies/narration.json'));
const baseline=json(path.join(root,'docs/lesson-144-start-baseline.json')),audioBaseline=json(path.join(root,'docs/lesson-144-narration-baseline.json'));
const authored=loadReferenceModule(dir,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='bhw-accreditation'),modules=[{key:'04-ra7883',lessons:[authored]}];
const ids=['accreditation-question','section-5','roles-and-records','fictional-process-cards','accreditation-follow-up','accreditation-application-check'];
describe('lesson 1.4.4 Demi accreditation draft',()=>{
 it('preserves the complete immutable manifest and full bilingual Read/Slide parity',()=>{
  expect(source.manifest).toEqual(baseline.immutable_manifest);expect(source.sections.map(s=>s.id)).toEqual(ids);expect(authored.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
  for(const lang of ['fil','en']){const read=parseReferenceRead(readFileSync(path.join(leaf,`read.${lang}.md`),'utf8'));expect(read.map(s=>s.id)).toEqual(ids);for(const [i,s]of read.entries())expect(authored.revision.slides[i][`narration_${lang}`]).toBe(s.body);expect(read[0].body).toContain('Demi');}
 });
 it('retains substantive old-ID resume and completion UUID independently of optional story',()=>{
  const lesson={...authored.manifest,id:'648d2168-74dd-4451-958c-e4e5d8724a17',revision:{...authored.revision,id:'new-draft'}};
  for(const mode of ['read','slides']){const id=mode==='read'?'section-5':'slide-section-5';expect(lessonPosition(lesson,mode,{lesson_id:lesson.id,revision_id:'old-published',position_key:id,concept_id:'m4.board-duties',modality:mode}).id).toBe(id);}
  expect(continueLesson([lesson],[{lesson_id:lesson.id}],[])).toBeNull();
 });
 it('maps all three concepts with meaningful source and substantive authority distinctions',()=>{
  expect(source.coverage.map(c=>c.id)).toEqual(['m4.accreditation-body','m4.board-duties','m4.registration-committee']);
  for(const c of source.coverage){expect(c.read_ids).toContain('section-5');expect(c.slide_ids).toContain('slide-section-5');expect(c.source_ids.length).toBeGreaterThan(0);}
  const sections=authored.revision.read_sections;expect(sections[1].body_en).toContain('joint DILG and DOH circular issued in 2023');expect(sections[1].body_en).toContain('different decisions');expect(sections[1].body_en).toContain('recommendation alone is not');expect(sections[2].body_en).toContain('If none exists');expect(sections[3].body_en).toContain('Do not invent');expect(sections[4].body_en).toContain('submits no actual application');
  const check=source.sections.at(-1).check;expect(check).toEqual(authored.revision.slides.at(-1).check);expect(check.options).toHaveLength(3);expect(check.correct_option_index).toBe(0);expect(check.feedback_en).toMatch(/First:.*Second:.*Third:/);expect(check.feedback_fil).toMatch(/Una:.*Ikalawa:.*Ikatlo:/);
 });
 it('uses only target Gemini styles and invalidates exact text/style/byte caches',()=>{
  const fresh=planReferenceNarration(modules,{lessons:{}},()=>null);expect(fresh).toHaveLength(12);expect(fresh.every(i=>i.provider==='gemini'&&i.speechStyle===BHW_ACCREDITATION_STORY_STYLES[i.language])).toBe(true);
  const changed=structuredClone(modules);changed[0].lessons[0].revision.read_sections[0].body_en+=' Verify the record.';expect(planReferenceNarration(changed,manifest,fileHash).find(i=>i.sectionId===ids[0]&&i.language==='en').action).toBe('render');
  const old=BHW_ACCREDITATION_STORY_STYLES.en;try{BHW_ACCREDITATION_STORY_STYLES.en+=' Pause.';expect(planReferenceNarration(modules,manifest,fileHash).find(i=>i.language==='en').action).toBe('render');}finally{BHW_ACCREDITATION_STORY_STYLES.en=old;}
  expect(planReferenceNarration(modules,manifest,()=> 'wrong').every(i=>i.action==='render')).toBe(true);
 });
 it('has twelve actual Kore tracks with exact ordered zone texts and measured durations',()=>{
  for(const options of [{},{provider:'gemini'}]){const plan=planReferenceNarration(modules,manifest,fileHash,options);expect(plan).toHaveLength(12);for(const i of plan){expect(i.action).toBe('skip');expect(i.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(i.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(i.zones);const duration=mp3AudioFrames(bytes(i.src)).reduce((n,f)=>n+f.samples/f.sampleRate,0);expect(i.existing.duration_seconds).toBeCloseTo(duration,3);for(const t of i.existing.timings)expect(t.end_ms).toBeGreaterThan(t.start_ms);expect(i.existing.timings.at(-1).end_ms).toBeLessThanOrEqual(duration*1000+1);}}
 });
 it('preserves all 161 sibling mappings, original histories and every original audio byte',()=>{
  for(const [key,hash]of Object.entries(audioBaseline.sibling_mapping_hashes))expect(sha(JSON.stringify(manifest.lessons[key]))).toBe(hash);
  for(const [key,hash]of Object.entries(audioBaseline.original_non_target_history_hashes))expect(sha(JSON.stringify(manifest.history[key]))).toBe(hash);
  expect(manifest.history['bhw-accreditation']).toContainEqual(audioBaseline.target);
  for(const [src,hash]of Object.entries(audioBaseline.all_original_track_hashes))expect(fileHash(src)).toBe(hash);
 });
 it('selects the actual old published Read and all six new sections without relaxed matching',()=>{
  const old=baseline.published_rows.find(r=>r.lesson_key==='bhw-accreditation');
  for(const lang of ['fil','en']){const selected=narrationForLesson(manifest,'bhw-accreditation',lang,old.read_sections);expect(Object.keys(selected)).toEqual(['section-5']);expect(selected['section-5'].src).toBe(audioBaseline.target.sections['section-5'][lang].src);expect(Object.keys(narrationForLesson(manifest,'bhw-accreditation',lang,authored.revision.read_sections))).toEqual(ids);}
 });
 it('protects all sibling Git bytes and approved 1.4.1/2/new3 media',()=>{
  for(const [p,hash]of Object.entries(baseline.sibling_lesson_git_blob_hashes)){const blob=execFileSync('git',['show',`HEAD:${p}`],{cwd:root});expect(sha(blob)).toBe(hash);}
  for(const m of baseline.approved141_142_143_media)expect(fileHash(m.path)).toBe(m.sha256);
 });
 it('uses genuinely new draft art with the approved Demi identity and identical animation bytes',()=>{
  const art=source.assets.find(a=>a.id==='demi-accreditation-question');expect(fileHash(art.path)).toBe(art.content_hash);expect(sha(readFileSync(path.join(root,'remotion/public/bhw-accreditation/scene.png')))).toBe(art.content_hash);expect(art.review_status).toBe('draft');
  const p=json(path.join(root,'docs/lesson-144-art-provenance.json'));expect(p.input_identity.sha256).toBe('032a985f9c336b745a99d284e2143d7559f070f76f6e85e64dbdaf4c7f9a89b2');expect(p.output.sha256).toBe(art.content_hash);expect(p.output.sha256).not.toBe(p.input_identity.sha256);expect(p.model_id).toBeNull();
 });
 it('ships two measured six-beat captioned stories with hash protection and complete ending hold',()=>{
  const asset=source.assets.find(a=>a.id===source.featured_asset_id);expect(asset.review_status).toBe('draft');expect(fileHash(asset.path)).toBe(asset.content_hash);
  for(const lang of ['fil','en']){const v=asset.videos[lang];for(const m of [v,v.poster,v.captions])expect(fileHash(m.path)).toBe(m.content_hash);const t=json(path.join(root,`remotion/public/bhw-accreditation/narration-${lang}.json`));expect(t).toMatchObject({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore'});expect(t.beats.map(b=>b.zone)).toEqual(BHW_ACCREDITATION_BEATS.map(b=>b.id));expect(t.beats.map(b=>b.text)).toEqual(BHW_ACCREDITATION_BEATS.map(b=>b[lang]));expect(bytes(v.captions.path).toString('utf8').replaceAll('\r','')).toBe(toWebVtt(t));expect(v.duration_s).toBeGreaterThan(t.durationSeconds);expect(v.duration_s).toBeLessThanOrEqual(90);expect(sha(readFileSync(path.join(root,`remotion/public/bhw-accreditation/narration-${lang}.mp3`)))).toBe(t.audio_sha256);}
 });
 it('provides twelve facilitator headings and one six-level single-objective indicator',()=>{
  for(const lang of ['fil','en']){const notes=readFileSync(path.join(leaf,`facilitator.${lang}.md`),'utf8');expect([...notes.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);for(const card of ['Card A','Card B','Card C'])expect(notes).toContain(card);expect(notes).toContain('30');expect(notes).toContain('180');}
  expect(authored.notes.observation_indicators).toHaveLength(1);expect(authored.notes.observation_indicators[0].objective_index).toBe(0);expect(Object.keys(authored.notes.observation_indicators[0].levels)).toHaveLength(6);
 });
});

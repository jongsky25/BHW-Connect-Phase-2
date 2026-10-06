// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration,mp3AudioFrames} from '../lib/reference-narration.mjs';
import {BHW_LEGAL_ROLE_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {BHW_LEGAL_ROLE_BEATS} from '../../remotion/src/bhw-legal-role/narration.ts';
import {lessonPosition,continueLesson} from '../../src/lib/elearning/reference-navigation.ts';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {toWebVtt} from '../lib/webvtt.mjs';
const root=path.resolve(import.meta.dirname,'../..'),dir=path.join(root,'content/training/day1-basic-competencies/modules/04-ra7883'),lessonDir=path.join(dir,'lessons/bhw-legal-role');
const json=p=>JSON.parse(readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=src=>readFileSync(path.join(root,'public',src.slice(1))),fileHash=src=>sha(bytes(src));
const source=json(path.join(lessonDir,'lesson.json')),manifest=json(path.join(root,'content/training/day1-basic-competencies/narration.json'));
const authored=loadReferenceModule(dir,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='bhw-legal-role'),modules=[{key:'04-ra7883',lessons:[authored]}];
const ids=['section-1','section-2','roles-and-authority','status-and-other-processes','explain-and-verify','legal-basis-check'];
describe('lesson 1.4.1 Demi legal basis',()=>{
 it('preserves immutable single-objective manifest, old IDs and full bilingual narration parity',()=>{
  expect(source.manifest).toEqual({lesson_key:'bhw-legal-role',position:0,title_fil:'Legal na batayan ng tungkulin',title_en:'The legal basis of the role',objectives_fil:['Maipaliwanag at mailapat sa isang sitwasyon: legal na batayan ng tungkulin.'],objectives_en:['Explain and apply in a situation: the legal basis of the role.'],required:true});
  expect(source.sections.map(s=>s.id)).toEqual(ids);expect(authored.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
  expect(source.coverage[0].id).toBe('m4.legal-basis');expect(source.coverage[0].read_ids).toEqual(ids);expect(source.coverage[0].source_ids).toContain('m4.legal-basis-source');
  for(const lang of ['fil','en']){const read=parseReferenceRead(readFileSync(path.join(lessonDir,`read.${lang}.md`),'utf8'));expect(read.map(s=>s.id)).toEqual(ids);for(const [i,s] of read.entries())expect(authored.revision.slides[i][`narration_${lang}`]).toBe(s.body);expect(read[0].body).toContain('Demi');expect(read.map(s=>s.body).join(' ')).not.toMatch(/Josie|Mimi|Corazon|Riza|Vlanche/);}
 });
 it('resumes both old sections in both modes and preserves completion identity',()=>{
  const lesson={...authored.manifest,id:'cf99b391-efbf-4efd-9588-59a7136567fc',revision:{...authored.revision,id:'new-draft'}};
  for(const mode of ['read','slides'])for(const id of ['section-1','section-2']){const position=mode==='read'?id:'slide-'+id;expect(lessonPosition(lesson,mode,{lesson_id:lesson.id,revision_id:'old-published',position_key:position,concept_id:'m4.legal-basis',modality:mode}).id).toBe(position);}
  expect(continueLesson([lesson],[{lesson_id:lesson.id}],[])).toBeNull();
 });
 it('teaches the statutory elements and authority without guarantees or a universal clinical rule',()=>{
  const sections=authored.revision.read_sections;expect(sections[1].body_en).toContain('accredited government or nongovernment organization');expect(sections[1].body_en).toContain('following Department of Health guidelines');expect(sections[2].body_en).toContain('Demi does not accredit herself');expect(sections[3].body_en).toContain('separate conditions and an application');expect(sections[3].body_en).toContain('not an automatic government appointment or a professional clinical licence');expect(sections[4].body_en).toContain('Who is the appropriate contact');
  const check=source.sections.at(-1).check;expect(check).toEqual(authored.revision.slides.at(-1).check);expect(check.options).toHaveLength(3);expect(check.correct_option_index).toBe(0);expect(check.feedback_en).toMatch(/First:.*Second:.*Third:/);expect(check.feedback_fil).toMatch(/Una:.*Ikalawa:.*Ikatlo:/);expect(source.sources[0].pdf_pages).toEqual([10,25,27]);expect(source.assets.some(a=>a.id==='practice-map')).toBe(false);
 });
 it('selects target-only Gemini styles by default and invalidates text/style cache',()=>{
  const fresh=planReferenceNarration(modules,{lessons:{}},()=>null);expect(fresh).toHaveLength(12);expect(fresh.every(i=>i.provider==='gemini'&&i.speechStyle===BHW_LEGAL_ROLE_STORY_STYLES[i.language])).toBe(true);
  const changed=structuredClone(modules);changed[0].lessons[0].revision.read_sections[0].body_en+=' Verify evidence.';expect(planReferenceNarration(changed,manifest,fileHash).find(i=>i.sectionId==='section-1'&&i.language==='en').action).toBe('render');
  const old=BHW_LEGAL_ROLE_STORY_STYLES.en;try{BHW_LEGAL_ROLE_STORY_STYLES.en+=' Pause before authority.';expect(planReferenceNarration(modules,manifest,fileHash).find(i=>i.language==='en').action).toBe('render');}finally{BHW_LEGAL_ROLE_STORY_STYLES.en=old;}
 });
 it('has twelve actual encoded current Kore tracks and exact zone text under both cache plans',()=>{
  for(const options of [{},{provider:'gemini'}]){const plan=planReferenceNarration(modules,manifest,fileHash,options);expect(plan).toHaveLength(12);for(const i of plan){expect(i.action).toBe('skip');expect(i.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(i.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(i.zones);const frames=mp3AudioFrames(bytes(i.src)),duration=frames.reduce((n,f)=>n+f.samples/f.sampleRate,0);expect(i.existing.duration_seconds).toBeCloseTo(duration,3);for(const t of i.existing.timings)expect(t.end_ms).toBeGreaterThan(t.start_ms);expect(i.existing.timings.at(-1).end_ms).toBeLessThanOrEqual(duration*1000+1);}}
 });
 it('protects every non-target mapping and selects both historical exact-text sections',()=>{
  const baseline=json(path.join(root,'docs/lesson-141-narration-baseline.json'));for(const [key,hash] of Object.entries(baseline.sibling_mapping_hashes)){
    if(key==='bhw-benefits'||key==='bhw-eligibility'||key==='bhw-accreditation'||key==='bhw-follow-up'||key==='bhw-relationships'||key==='bhw-barangay-partners'){
      const retained=manifest.history[key].find(h=>sha(JSON.stringify(h))===hash);expect(retained).toBeDefined();
      for(const languages of Object.values(retained.sections))for(const track of Object.values(languages))expect(fileHash(track.src)).toBe(track.sha256);
    }else expect(sha(JSON.stringify(manifest.lessons[key]))).toBe(hash);
  }
  expect(manifest.history['bhw-legal-role'].some(h=>JSON.stringify(h)===JSON.stringify(baseline.target))).toBe(true);
  for(const lang of ['fil','en'])for(const id of ['section-1','section-2']){const old=baseline.target.sections[id][lang],section={id,[`heading_${lang}`]:old.timings.filter(t=>t.zone==='heading').map(t=>t.text).join(' '),[`body_${lang}`]:old.timings.filter(t=>t.zone==='body').map(t=>t.text).join(' '),[`takeaway_${lang}`]:old.timings.filter(t=>t.zone==='takeaway').map(t=>t.text).join(' ')};expect(narrationForLesson(manifest,'bhw-legal-role',lang,[section])[id].src).toBe(old.src);}
  for(const lang of ['fil','en'])expect(Object.keys(narrationForLesson(manifest,'bhw-legal-role',lang,authored.revision.read_sections))).toEqual(ids);for(const [src,hash] of Object.entries(baseline.historical_target_hashes))expect(fileHash(src)).toBe(hash);
 });
 it('uses new owner-approved Demi art, with exact prompt and identical Remotion bytes',()=>{
  const art=source.assets.find(a=>a.id==='demi-legal-basis');expect(fileHash(art.path)).toBe(art.content_hash);expect(sha(readFileSync(path.join(root,'remotion/public/bhw-legal-role/scene.png')))).toBe(art.content_hash);expect(art.review_status).toBe('approved');expect(art.provenance).toContain('Exact prompt:');const approval=json(path.join(root,'docs/lesson-141-owner-approval.json'));expect(approval.authorization).toBe('approved. merge and deploy to live');expect(approval.approved_asset_ids).toEqual(['demi-legal-basis','bhw-legal-role-story']);expect(approval.approved_media).toHaveLength(19);for(const media of approval.approved_media)expect(fileHash(media.path)).toBe(media.sha256);expect(art.path).not.toMatch(/mimi|josie/i);for(const s of source.sections)expect(s.asset_ids).toContain(art.id);
 });
 it('has two measured six-beat stories with exact hashes and derived VTT captions',()=>{
  const asset=source.assets.find(a=>a.id===source.featured_asset_id);expect(asset).toBeDefined();expect(asset.review_status).toBe('approved');expect(fileHash(asset.path)).toBe(asset.content_hash);
  for(const lang of ['fil','en']){const v=asset.videos[lang];expect(fileHash(v.path)).toBe(v.content_hash);expect(fileHash(v.poster.path)).toBe(v.poster.content_hash);expect(fileHash(v.captions.path)).toBe(v.captions.content_hash);const t=json(path.join(root,`remotion/public/bhw-legal-role/narration-${lang}.json`));expect(t).toMatchObject({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore'});expect(t.beats.map(b=>b.zone)).toEqual(BHW_LEGAL_ROLE_BEATS.map(b=>b.id));expect(t.beats.map(b=>b.text)).toEqual(BHW_LEGAL_ROLE_BEATS.map(b=>b[lang]));expect(bytes(v.captions.path).toString('utf8').replaceAll('\r','')).toBe(toWebVtt(t));expect(v.duration_s).toBeGreaterThan(t.durationSeconds);expect(v.duration_s).toBeLessThanOrEqual(90);}
 });
 it('aligns twelve guide headings and one six-level observation indicator to both practice cases',()=>{
  for(const lang of ['fil','en']){const notes=readFileSync(path.join(lessonDir,`facilitator.${lang}.md`),'utf8');expect([...notes.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);expect(notes).toContain('Card A');expect(notes).toContain('Card B');expect(notes).toContain('45');expect(notes).toContain('180');expect(notes).toContain('25');expect(notes).not.toMatch(/Josie|Mimi|PDF 23/);}
  expect(authored.notes.observation_indicators).toHaveLength(1);expect(authored.notes.observation_indicators[0].objective_index).toBe(0);expect(Object.keys(authored.notes.observation_indicators[0].levels)).toHaveLength(6);
 });
});

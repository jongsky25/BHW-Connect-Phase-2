import {beforeProposed161} from './lesson-161-proposal-compat.mjs';
// @vitest-environment node
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {beforeProposed155} from './lesson-155-proposal-compat.mjs';
import {loadReferenceModule,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration,mp3AudioFrames} from '../lib/reference-narration.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
const root=path.resolve(import.meta.dirname,'../..'),base='content/training/day1-basic-competencies/modules/05-bhw-at-barangay/',leaf=base+'lessons/bhw-self-management/';
const file=p=>beforeProposed161(p),j=p=>JSON.parse(file(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const integration=j('docs/lesson-155-integration-baseline.json');
const baseline=j('docs/lesson-155-baseline.json'),source=j(leaf+'lesson.json');
const trainingModule=loadReferenceModule(root+'/'+base,root+'/public'),lesson=trainingModule.lessons.find(l=>l.manifest.lesson_key==='bhw-self-management');
const ids=['section-9','self-reliability','self-stress-time','self-trust-honesty','self-adaptability','section-10','self-application-check'];
const before=p=>{const bytes=beforeProposed155(p);expect(sha(bytes),p+' predecessor').toBe(integration.file_hashes[p]);return bytes;};
describe('lesson 1.5.5 self-management content and protection',()=>{
 it('keeps identity and substantive original anchors, complete bilingual section and slide coverage',()=>{
  expect(source.manifest).toEqual(baseline.manifest);expect(lesson.revision.read_sections.map(s=>s.id)).toEqual(ids);
  expect(lesson.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
  expect(source.coverage.map(c=>c.id)).toEqual(['m5.self-management-skills','m5.self-management-improve']);
  for(let i=0;i<7;i++)for(const lang of ['fil','en']){
   expect(lesson.revision.read_sections[i]['body_'+lang].length).toBeGreaterThan(300);
   expect(lesson.revision.slides[i]['narration_'+lang]).toBe(lesson.revision.read_sections[i]['body_'+lang]);
   expect(lesson.revision.slides[i]['display_'+lang].length).toBeLessThanOrEqual(600);
  }
 });
 it('explicitly teaches six skills, all eight habits, a measurable SMART example and realistic limits',()=>{
  const bodies=lesson.revision.read_sections.map(s=>s.body_en).join(' ');
  for(const term of ['reliability','stress management','time management','trustworthiness','adaptability','honest and careful'])expect(bodies.toLowerCase()).toContain(term);
  const habits=lesson.revision.read_sections.find(s=>s.id==='section-10').body_en;
  for(const term of ['self-care','patience','one task at a time','reflection','SMART','weekly planning','meeting preparation','thinking before speaking','Monday','Wednesday','Friday'])expect(habits).toContain(term);
  expect(bodies).toContain('an excessive workload is not one person’s fault');expect(bodies).toContain('an immediate danger must not wait');
 });
 it('has a new owner-approved image on every screen, with exact bytes and accessible bilingual descriptions',()=>{
  for(const screen of [...lesson.revision.read_sections,...lesson.revision.slides]){
   const images=source.assets.filter(a=>screen.asset_ids.includes(a.id));expect(images).toHaveLength(1);
   for(const a of images){expect(a.id).toMatch(/^malou-self-/);expect(a.review_status).toBe('approved');expect(sha(file('public'+a.path))).toBe(a.content_hash);for(const field of ['alt_fil','alt_en','caption_fil','caption_en'])expect(a[field].length).toBeGreaterThan(20);}
  }
 });
 it('uses plausible choices with complete feedback and an optional-disclosure personal exercise',()=>{
  const check=source.sections.at(-1).check;expect(check.options).toHaveLength(3);expect(check.correct_option_index).toBe(0);
  for(const lang of ['fil','en'])for(const letter of ['A:','B:','C:'])expect(check['feedback_'+lang]).toContain(letter);
  expect(lesson.revision.read_sections.at(-1).body_en).toContain('You may use a fictional example');
  expect(lesson.revision.read_sections.at(-1).body_en).toContain('without watching the optional story');
 });
 it('provides canonical bilingual private guides, a complete practical indicator and audited original sources',()=>{
  for(const lang of ['fil','en'])expect([...file(leaf+`facilitator.${lang}.md`).toString().matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);
  const indicators=j(leaf+'competency.json').observation_indicators;expect(indicators).toHaveLength(source.manifest.objectives_en.length);expect(Object.keys(indicators[0].levels)).toHaveLength(6);
  const audit=j('docs/lesson-155-source-audit.json');expect(audit.original_pdfs).toHaveLength(3);expect(audit.original_page_images_inspected).toHaveLength(3);expect(audit.crosswalk.all_eight_habits).toEqual(['section-10']);
 });
 it('preserves every earlier module lesson, public byte and UUID lock',()=>{
  const allowed=new Set([base+'lesson.en.md',base+'lesson.fil.md',base+'qa-entries.json','content/training/day1-basic-competencies/narration.json']);
  for(const [p,h]of Object.entries(integration.file_hashes))if(!p.startsWith(leaf)&&!allowed.has(p))expect(sha(file(p)),p).toBe(h);
 },30000);
 it('changes only the two self-management shared passages and chatbot answers',()=>{
  const split=s=>s.split(/(?=^## )/m);
  for(const lang of ['fil','en']){
   const p=base+`lesson.${lang}.md`,old=split(before(p).toString()),current=split(file(p).toString());expect(current).toHaveLength(old.length);
   for(let i=0;i<old.length;i++)if(!old[i].split('\n')[0].includes('m5.self-management-'))expect(current[i]).toBe(old[i]);
  }
  const old=JSON.parse(before(base+'qa-entries.json')),current=j(base+'qa-entries.json');
  expect(current.entries.map(e=>e.id)).toEqual(old.entries.map(e=>e.id));
  expect(current.entries.filter((e,i)=>JSON.stringify(e)!==JSON.stringify(old.entries[i])).map(e=>e.id)).toEqual(['d1m5-self-management-skills','d1m5-self-management-improve']);
 });
});
describe('lesson 1.5.5 exact generated media',()=>{
 it('selects all fourteen new Gemini tracks and preserves old target audio and every sibling mapping',()=>{
  const mf=j('content/training/day1-basic-competencies/narration.json');
  const plan=planReferenceNarration([{key:'05-bhw-at-barangay',lessons:[lesson]}],mf,src=>fs.existsSync(root+'/public'+src)?sha(file('public'+src)):null);
  expect(plan).toHaveLength(14);
  for(const item of plan){expect(item.action,item.sectionId+'/'+item.language).toBe('skip');expect(item.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(item.existing.duration_seconds).toBeCloseTo(mp3AudioFrames(file('public'+item.src)).reduce((n,f)=>n+f.samples/f.sampleRate,0),3);}
  const old=JSON.parse(before('content/training/day1-basic-competencies/narration.json'));
  for(const [key,value]of Object.entries(old.lessons))if(key!=='bhw-self-management')expect(mf.lessons[key],key).toEqual(value);
  for(const [key,value]of Object.entries(old.history??{}))expect(mf.history[key].slice(0,value.length),key).toEqual(value);
  expect(mf.history['bhw-self-management']).toContainEqual(baseline.narration_entry);
  for(const lang of ['fil','en'])expect(Object.keys(narrationForLesson(mf,'bhw-self-management',lang,lesson.revision.read_sections))).toEqual(ids);
 });
 it('keeps captions, timing and both optional video languages linked to actual hashed media',()=>{
  const story=source.assets.find(a=>a.id===source.featured_asset_id);expect(story.review_status).toBe('approved');
  for(const lang of ['fil','en']){
   const video=story.videos[lang];expect(video.duration_s).toBeLessThanOrEqual(90);
   for(const media of [video,video.poster,video.captions])expect(sha(file('public'+media.path))).toBe(media.content_hash);
   expect(file('public'+video.captions.path).toString()).toContain('WEBVTT');
   const timing=j(`remotion/public/bhw-self-management/narration-${lang}.json`);expect(timing.beats).toHaveLength(6);
   expect(sha(file(`remotion/public/bhw-self-management/narration-${lang}.mp3`))).toBe(timing.audio_sha256);
   expect(timing.beats.at(-1).end_ms).toBeLessThanOrEqual(timing.durationSeconds*1000+50);
  }
 });
});

 it('binds release approval to exact reviewed teaching and selected media bytes',()=>{const approval=j('docs/lesson-155-owner-approval.json');expect(approval.authorization).toBe('approved. merge and deploy to live');expect(approval.reviewed_head).toBe('1216d5aeb301a2707a0d51e38227b69a6c80ebfb');expect(sha(file('docs/lesson-155-proposal-receipt.json'))).toBe(approval.reviewed_proposal_receipt_sha256);for(const [p,h]of Object.entries(approval.approved_source_sha256))expect(sha(file(p)),p).toBe(h);for(const m of approval.approved_media)expect(sha(file('public'+m.path)),m.path).toBe(m.sha256);const reviewed=JSON.parse(j('docs/lesson-155-proposal-receipt.json').changed_existing_files[leaf+'lesson.json'].predecessor_utf8);expect(reviewed.manifest).toEqual(source.manifest);const publishedMetadata=structuredClone(source);for(const a of publishedMetadata.assets)if(approval.approved_asset_ids.includes(a.id))a.review_status='draft';expect(sha(Buffer.from(JSON.stringify(publishedMetadata,null,2)+'\n'))).toBe(approval.reviewed_source_sha256[leaf+'lesson.json']);});

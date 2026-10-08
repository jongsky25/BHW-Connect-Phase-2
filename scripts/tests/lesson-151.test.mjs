import {beforeProposed155} from './lesson-155-proposal-compat.mjs';
import {approved154Path,approved154LessonPaths,teamworkLeaf,approved154HistoricalMapping,beforeApproved154} from './lesson-154-release-compat.mjs';
// @vitest-environment node
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration,mp3AudioFrames} from '../lib/reference-narration.mjs';
import {BHW_RELATIONSHIPS_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {lessonPosition} from '../../src/lib/elearning/reference-navigation.ts';
import {BHW_RELATIONSHIPS_BEATS} from '../../remotion/src/bhw-relationships/narration.ts';
import {toWebVtt} from '../lib/webvtt.mjs';
import {approved153Path,approved153LessonPaths,localPartnersLeaf,withoutApproved153Registry} from './lesson-153-release-compat.mjs';
const root=path.resolve(import.meta.dirname,'../..'),base='content/training/day1-basic-competencies/modules/05-bhw-at-barangay/',dir=root+'/'+base,leaf=dir+'lessons/bhw-relationships/';
const j=p=>JSON.parse(beforeProposed155(p).toString('utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),bytes=p=>fs.readFileSync(root+'/public'+p),hash=p=>sha(bytes(p));
const baseline=j('docs/lesson-151-local-baseline.json'),published=j('docs/lesson-151-published-baseline.json'),source=j(base+'lessons/bhw-relationships/lesson.json');
const authored=loadReferenceModule(dir,root+'/public').lessons.find(l=>l.manifest.lesson_key==='bhw-relationships'),mf=j('content/training/day1-basic-competencies/narration.json'),modules=[{key:'05-bhw-at-barangay',lessons:[authored]}];
const ids=['section-1','section-2','community-listening','section-3','shared-support','relationships-application-check'];
describe('lesson1.5.1 Malou draft protection and application',()=>{
 it('preserves immutable identity, complete UUID lock and all substantive original resume paths',()=>{
  expect(source.manifest).toEqual(baseline.target_manifest);expect(j('content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json')).toEqual(baseline.uuid_lock);
  expect(source.sections.map(s=>s.id)).toEqual(ids);
  const lesson={id:'118879c7-5f7a-4283-9f92-820687ebbddb',...source.manifest,revision:authored.revision};
  for(const mode of ['read','slides'])for(const id of ['section-1','section-2','section-3']){
   const position=mode==='read'?id:'slide-'+id;expect(lessonPosition(lesson,mode,{position_key:position,concept_id:"m5.four-relationships"}).id).toBe(position);
   const item=authored.revision.read_sections.find(s=>s.id===id);expect(item.body_fil.length).toBeGreaterThan(150);expect(item.body_en.length).toBeGreaterThan(150);
  }
 });
 it('has six aligned bilingual screens, application feedback for every choice and one coverage concept',()=>{
  for(const lang of ['fil','en']){
   const read=parseReferenceRead(fs.readFileSync(leaf+`read.${lang}.md`,'utf8'));expect(read.map(s=>s.id)).toEqual(ids);
   for(const [i,s]of read.entries()){expect(authored.revision.slides[i].id).toBe('slide-'+s.id);expect(authored.revision.slides[i][`narration_${lang}`]).toBe(s.body);expect(s.body).not.toContain('Marites');}
  }
  expect(source.coverage).toHaveLength(1);expect(source.coverage[0]).toMatchObject({id:'m5.four-relationships',read_ids:ids,slide_ids:ids.map(i=>'slide-'+i)});
  const c=source.sections.at(-1).check;expect(c.options).toHaveLength(3);expect(c.correct_option_index).toBe(0);
  for(const word of ['First:','Second:','Third:'])expect(c.feedback_en).toContain(word);
  for(const word of ['Una:','Ikalawa:','Ikatlo:'])expect(c.feedback_fil).toContain(word);
  expect(authored.revision.read_sections[1].body_en).toContain('authored teaching organizer');expect(authored.revision.read_sections[0].body_en).toContain('without watching the optional story');
 });
 it('has both full canonical guides, one bounded indicator and measured self-study time',()=>{
  for(const lang of ['fil','en']){
   const t=fs.readFileSync(leaf+`facilitator.${lang}.md`,'utf8');expect([...t.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);expect(t).not.toContain('SELF_STUDY_TIMING_PENDING');expect(t).not.toContain('Marites');expect(t).toContain('180');expect(t).toContain('30');
  }
  const indicators=j(base+'lessons/bhw-relationships/competency.json').observation_indicators;expect(indicators).toHaveLength(1);expect(indicators[0].objective_index).toBe(0);expect(Object.keys(indicators[0].levels)).toHaveLength(6);
 });
 it('retains every starting public MP3 byte and all35 same-module sibling files',()=>{
  const audio=Object.entries(baseline.tracked_hashes).filter(([p])=>p.startsWith('public/')&&p.endsWith('.mp3'));expect(audio).toHaveLength(2511);
  for(const [p,h]of Object.entries(baseline.tracked_hashes).filter(([p])=>p.startsWith('public/')))expect(sha(beforeProposed155(p))).toBe(h);
  expect(baseline.same_module_protected_files).toHaveLength(35);for(const p of baseline.same_module_protected_files.filter(p=>!p.includes("/lessons/bhw-barangay-partners/")&&!p.startsWith(localPartnersLeaf)&&!p.startsWith(teamworkLeaf)))expect(sha(beforeProposed155(p))).toBe(baseline.tracked_hashes[p]);for(const p of approved153LessonPaths)approved153Path(p);for(const p of approved154LessonPaths)approved154Path(p);
 },30000);
 it('preserves95 approved1.4 media bytes, all historical tracked receipts and10 package receipts',()=>{
  const media=j('docs/lesson-151-protected-media.json').media;expect(media).toHaveLength(95);for(const m of media)expect(hash(m.path)).toBe(m.sha256);
  expect(j('docs/lesson-151-protected-packages.json').packages).toHaveLength(10);
  for(const [p,h]of Object.entries(baseline.tracked_hashes).filter(([p])=>/^docs\/lesson-(135|14[1-5])/.test(p)))expect(sha(beforeProposed155(p))).toBe(h);
 });
 it('protects all non-target mappings and prior history while retaining target history',()=>{
  for(const [k,v]of Object.entries(baseline.non_target_mappings)){if(k==="bhw-teamwork"){approved154HistoricalMapping(mf,sha(JSON.stringify(v)),hash,x=>sha(JSON.stringify(x)));}else if(k==="bhw-barangay-partners"||k==="bhw-local-partners"){expect(mf.history[k]).toContainEqual(v);for(const langs of Object.values(v.sections))for(const t of Object.values(langs))expect(hash(t.src)).toBe(t.sha256);if(k==='bhw-local-partners')approved153Path('content/training/day1-basic-competencies/narration.json');}else expect(mf.lessons[k]).toEqual(v);}
  for(const [k,v]of Object.entries(baseline.original_history)){if(k==='bhw-relationships'||k==='bhw-barangay-partners'||k==='bhw-local-partners')expect(mf.history[k].slice(0,v.length)).toEqual(v);else expect(mf.history[k]).toEqual(v);}
  expect(mf.history['bhw-relationships']).toContainEqual(baseline.original_target_mapping);
 });
 it('selects all6 historical published tracks and all12 draft tracks without selector overrides',()=>{
  const old=published.rows.find(r=>r.lesson.lesson_key==='bhw-relationships').revision;
  for(const lang of ['fil','en']){
   const selected=narrationForLesson(mf,'bhw-relationships',lang,old.read_sections);expect(Object.keys(selected)).toEqual(['section-1','section-2','section-3']);
   for(const id of Object.keys(selected)){const track=baseline.original_target_mapping.sections[id][lang];expect(selected[id].src).toBe(track.src);expect(hash(track.src)).toBe(track.sha256);}
   expect(Object.keys(narrationForLesson(mf,'bhw-relationships',lang,authored.revision.read_sections))).toEqual(ids);
  }
 });
 it('uses12 actual Gemini Kore tracks with exact zones, finite measured timings and strict cache invalidation',()=>{
  for(const options of [{},{provider:'gemini'}]){
   const plan=planReferenceNarration(modules,mf,hash,options);expect(plan).toHaveLength(12);
   for(const item of plan){expect(item.action).toBe('skip');expect(item.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(item.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(item.zones);const duration=mp3AudioFrames(bytes(item.src)).reduce((s,f)=>s+f.samples/f.sampleRate,0);expect(item.existing.duration_seconds).toBeCloseTo(duration,3);for(const [i,t]of item.existing.timings.entries()){expect(Number.isFinite(t.start_ms)).toBe(true);expect(t.end_ms).toBeGreaterThan(t.start_ms);if(i)expect(t.start_ms).toBeGreaterThanOrEqual(item.existing.timings[i-1].end_ms);}expect(item.existing.timings.at(-1).end_ms).toBeLessThanOrEqual(duration*1000+1);}
  }
  const original=BHW_RELATIONSHIPS_STORY_STYLES.en;
  try{BHW_RELATIONSHIPS_STORY_STYLES.en+=' Pause.';expect(planReferenceNarration(modules,mf,hash).find(i=>i.language==='en').action).toBe('render');}finally{BHW_RELATIONSHIPS_STORY_STYLES.en=original;}
  expect(planReferenceNarration(modules,mf,()=> 'bad').every(i=>i.action==='render')).toBe(true);
 });
 it('uses genuinely new draft Malou art with exact identity provenance and scene bytes',()=>{
  const art=source.assets.find(a=>a.id==='malou-courtyard'),p=j('docs/lesson-151-malou-series-brief.json');expect(hash(art.path)).toBe(art.content_hash);expect(sha(fs.readFileSync(root+'/remotion/public/bhw-relationships/scene.png'))).toBe(art.content_hash);expect(p.output_sha256).toBe(art.content_hash);expect(p.model_id).toBeNull();expect(p.supplied_inputs).toEqual([]);expect(p.dimensions).toEqual([1536,1024]);expect(art.review_status).toBe('approved');expect(p.prompt).toContain('courtyard');
 });
 it('ships two captioned6-beat stories with measured complete endings and real hashed files',()=>{
  const a=source.assets.find(a=>a.id===source.featured_asset_id);expect(a.review_status).toBe('approved');
  for(const lang of ['fil','en']){
   const v=a.videos[lang],t=j(`remotion/public/bhw-relationships/narration-${lang}.json`);for(const m of [v,v.poster,v.captions])expect(hash(m.path)).toBe(m.content_hash);
   expect(t.beats.map(b=>b.zone)).toEqual(BHW_RELATIONSHIPS_BEATS.map(b=>b.id));expect(t.beats.map(b=>b.text)).toEqual(BHW_RELATIONSHIPS_BEATS.map(b=>b[lang]));expect(bytes(v.captions.path).toString().replaceAll('\r','')).toBe(toWebVtt(t));expect(v.duration_s).toBeGreaterThan(t.durationSeconds);expect(v.duration_s).toBeLessThanOrEqual(90);expect(sha(fs.readFileSync(root+`/remotion/public/bhw-relationships/narration-${lang}.mp3`))).toBe(t.audio_sha256);
  }
 });
 it('reviews all14 selected encoded files and30 real focused excerpts with finite PCM evidence',()=>{
  const full=j('docs/lesson-151-audio-review.json'),focused=j('docs/lesson-151-audio-focus.json');expect(full.records).toHaveLength(14);expect(focused.records).toHaveLength(14);expect(focused.decode_only).toBe(false);expect(focused.model).toBe('gemini-3.8-flash');
  const selected=[];for(const langs of Object.values(mf.lessons['bhw-relationships'].sections))for(const t of Object.values(langs))selected.push(t.sha256);
  const story=source.assets.find(a=>a.id===source.featured_asset_id);for(const v of Object.values(story.videos))selected.push(v.content_hash);
  expect(focused.records.map(r=>r.source_sha256).sort()).toEqual(selected.sort());expect(full.records.map(r=>r.source_video_sha256??r.sha256).sort()).toEqual(selected.sort());
  let count=0;for(const r of full.records){expect(r.model_response.length).toBeGreaterThan(100);expect(r.model_response).toContain('transcript');}
  for(const r of focused.records){expect(hash(r.source_path)).toBe(r.source_sha256);expect(r.decoded_pcm_sha256).toMatch(/^[a-f0-9]{64}$/);expect(r.full_audio_metrics.samples).toBeGreaterThan(24000);expect(r.full_audio_metrics.rms).toBeGreaterThan(0.002);expect(r.zones.length).toBeGreaterThan(3);for(const z of r.zones){expect(Number.isFinite(z.rms)).toBe(true);expect(z.samples).toBeGreaterThan(0);expect(z.end_ms).toBeGreaterThan(z.start_ms);}for(const e of r.excerpts){count++;expect(e.excerpt_sha256).toMatch(/^[a-f0-9]{64}$/);expect(e.decoded_sample_count).toBeGreaterThan(0);expect(e.end).toBeGreaterThan(e.start);expect(e.model_response.length).toBeGreaterThan(100);expect(e.model_response).toContain('transcript');}}
  expect(count).toBe(30);
 });
 it('preserves the complete ordered original registry except exactly two appended151 IDs',()=>{
  const s=withoutApproved153Registry(beforeProposed155('remotion/src/Root.tsx').toString('utf8').replaceAll('\r\n','\n')).replace(/^import \{BhwBarangayPartnersStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`bhw-barangay-partners-[\s\S]*?      \)\)\}\n/,'');
  expect((s.match(/id=\{language === "fil" \? "BhwRelationshipsStoryFil"/g)??[])).toHaveLength(1);
  const stripped=s.replace(/^import \{BhwRelationshipsStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`bhw-relationships-[\s\S]*?      \)\)\}\n/,'');expect(stripped).toBe(baseline.composition_registry.replaceAll('\r\n','\n'));
 });
 it('confines shared changes to four target QA rows, four opening passages and documented timing correction',()=>{
  const shared=baseline.shared_files;
  const old=JSON.parse(shared[base+'qa-entries.json']),current=JSON.parse(beforeApproved154(base+'qa-entries.json'));const allowed=['d1m5-four-relationships','d1m5-who-for-clinical','d1m5-who-for-admin-support','d1m5-role-of-peer-bhw','d1m5-punong-barangay','d1m5-local-health-board-composition','d1m5-other-stakeholders'];approved153Path(base+'qa-entries.json');expect(current.entries.map(r=>r.id)).toEqual(old.entries.map(r=>r.id));for(const row of current.entries)if(!allowed.includes(row.id))expect(row).toEqual(old.entries.find(r=>r.id===row.id));
  for(const p of ['activities.json','competency.json','coverage.json'])expect(fs.readFileSync(dir+p,'utf8')).toBe(shared[base+p]);
  for(const lang of ['fil','en']){
   const p=base+`lesson.${lang}.md`;approved153Path(p);const parts=s=>s.split(/(?=^## )/m),before=parts(shared[p]),now=parts(beforeApproved154(p));expect(now.length).toBe(before.length);for(let i=7;i<now.length;i++)expect(now[i]).toBe(before[i]);
   const t=fs.readFileSync(dir+`facilitator-notes.${lang}.md`,'utf8'),table=[...t.matchAll(/\|[^\n]+\| (\d+) min \|/g)].map(m=>+m[1]);expect(table).toHaveLength(6);expect(table.reduce((s,n)=>s+n,0)).toBe(180);
  }
  const oldSources=JSON.parse(shared['content/training/day1-basic-competencies/sources.json']).sources,currentSources=j('content/training/day1-basic-competencies/sources.json').sources;for(const [k,v]of Object.entries(oldSources))expect(currentSources[k]).toEqual(v);expect(Object.keys(currentSources).filter(k=>!oldSources[k])).toEqual(['bhw-relationships-training','bhw-barangay-partners-training']);
 });
});

it('binds owner approval to all19 exact reviewed media bytes',()=>{const a=j('docs/lesson-151-owner-approval.json');expect(a.authorization).toBe('approved. merge and deploy to live');expect(a.reviewed_head).toBe('6bba868832ad48d2eb86f41739cd6da12c4d9f26');expect(a.approved_media).toHaveLength(19);for(const m of a.approved_media)expect(hash(m.path)).toBe(m.sha256);expect(source.assets.every(x=>x.review_status==='approved')).toBe(true);expect(j('docs/lesson-151-malou-series-brief.json').reference_status).toContain('Owner-approved');});

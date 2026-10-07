import {approved153Path,localPartnersLeaf,withoutApproved153Registry} from './lesson-153-release-compat.mjs';
// @vitest-environment node
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {loadReferenceModule,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration,mp3AudioFrames} from '../lib/reference-narration.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
const root=path.resolve(import.meta.dirname,'../..'),base='content/training/day1-basic-competencies/modules/05-bhw-at-barangay/',leaf=base+'lessons/bhw-teamwork/';
const file=p=>fs.readFileSync(root+'/'+p),j=p=>JSON.parse(file(p)),sha=b=>createHash('sha256').update(b).digest('hex'),hash=p=>sha(file('public'+p));
const b=j('docs/lesson-154-current-baseline.json'),source=j(leaf+'lesson.json'),mf=j('content/training/day1-basic-competencies/narration.json');
const lesson=loadReferenceModule(root+'/'+base,root+'/public').lessons.find(l=>l.manifest.lesson_key==='bhw-teamwork');
describe('lesson 1.5.4 teamwork and protected release checks',()=>{
 it('keeps immutable identity, original substantive anchors and both concepts',()=>{
  expect(source.manifest).toEqual(b.target.manifest);expect(j('content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json')).toEqual(b.uuid_lock);
  expect(lesson.revision.read_sections[0].id).toBe('section-8');expect(lesson.revision.slides[0].id).toBe('slide-section-8');
  expect(lesson.revision.read_sections[0].body_en.length).toBeGreaterThan(200);expect(source.coverage.map(c=>c.id)).toEqual(['m5.teamwork-practices','m5.competency']);
 });
 it('has six complete bilingual screens with a real image on every Read and Slides screen and exact narration parity',()=>{
  expect(lesson.revision.read_sections).toHaveLength(6);expect(lesson.revision.slides).toHaveLength(6);
  for(let i=0;i<6;i++){const read=lesson.revision.read_sections[i],slide=lesson.revision.slides[i];
   for(const lang of ['fil','en']){expect(slide['narration_'+lang]).toBe(read['body_'+lang]);expect(slide['display_'+lang].split('\n').length).toBeGreaterThanOrEqual(3);}
   for(const screen of [read,slide]){expect(screen.asset_ids).toContain('malou-teamwork');for(const id of screen.asset_ids){const a=source.assets.find(a=>a.id===id);expect(hash(a.path)).toBe(a.content_hash);}}
  }
 });
 it('has three plausible choices and feedback for every option in both languages',()=>{
  const c=source.sections.at(-1).check;expect(c.options).toHaveLength(3);expect(c.correct_option_index).toBe(0);
  for(const lang of ['fil','en'])for(const letter of ['A','B','C'])expect(c['feedback_'+lang]).toContain(letter);
  for(const o of c.options)expect(o).not.toHaveProperty('feedback');
 });
 it('uses canonical guides and one complete observable indicator',()=>{
  for(const lang of ['fil','en'])expect([...file(leaf+`facilitator.${lang}.md`).toString().matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);
  const indicators=j(leaf+'competency.json').observation_indicators;expect(indicators).toHaveLength(1);expect(indicators[0].objective_index).toBe(0);expect(Object.keys(indicators[0].levels)).toHaveLength(6);
 });
 it('preserves every sibling source, prior public byte and approved media',()=>{
  for(const [p,h]of Object.entries(b.same_module_protected_hashes))if(p.startsWith(localPartnersLeaf))approved153Path(p);else expect(sha(file(p))).toBe(h);
  for(const [p,h]of Object.entries(b.tracked_file_hashes).filter(([p])=>p.startsWith('public/')))expect(sha(file(p))).toBe(h);
  for(const a of b.approved_protected_media)expect(hash(a.path)).toBe(a.sha256);
 },30000);
 it('keeps all non-target narration and exact old target selection',()=>{
  for(const [k,v]of Object.entries(b.narration_manifest.lessons))if(k==='bhw-local-partners'){expect(mf.history[k]).toContainEqual(v);approved153Path('content/training/day1-basic-competencies/narration.json');}else if(k!=='bhw-teamwork')expect(mf.lessons[k]).toEqual(v);
  for(const [k,v]of Object.entries(b.narration_manifest.history??{}))expect(k==='bhw-teamwork'||k==='bhw-local-partners'?mf.history[k].slice(0,v.length):mf.history[k]).toEqual(v);
  expect(mf.history['bhw-teamwork']).toContainEqual(b.narration_manifest.lessons['bhw-teamwork']);
  const old=b.published_snapshot.rows.find(r=>r.lesson.lesson_key==='bhw-teamwork').revision;
  for(const lang of ['fil','en']){const selected=narrationForLesson(mf,'bhw-teamwork',lang,old.read_sections);expect(Object.keys(selected)).toEqual(['section-8']);expect(selected['section-8'].src).toBe(b.narration_manifest.lessons['bhw-teamwork'].sections['section-8'][lang].src);}
 });
 it('appends exactly the target composition pair while preserving the prior registry source',()=>{
  let s=withoutApproved153Registry(file('remotion/src/Root.tsx').toString());s=s.replace(/^import \{BhwTeamworkStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`bhw-teamwork-[\s\S]*?      \)\)\}\n/,'');expect(s).toBe(b.existing_registry_source);
 });
 it('selects twelve exact new tracks with measured encoded durations',()=>{
  const plan=planReferenceNarration([{key:'05-bhw-at-barangay',lessons:[lesson]}],mf,src=>fs.existsSync(root+'/public'+src)?hash(src):null);
  expect(plan).toHaveLength(12);for(const p of plan){expect(p.action).toBe('skip');expect(p.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(p.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(p.zones);expect(p.existing.duration_seconds).toBeCloseTo(mp3AudioFrames(file('public'+p.src)).reduce((s,f)=>s+f.samples/f.sampleRate,0),3);}
  for(const lang of ['fil','en'])expect(Object.keys(narrationForLesson(mf,'bhw-teamwork',lang,lesson.revision.read_sections))).toHaveLength(6);
 });
});

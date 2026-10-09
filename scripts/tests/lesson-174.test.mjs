// @vitest-environment node
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {beforeProposed174,reviewed174} from '../lib/lesson-174-proposal.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
const leaf='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-action-plan/';
const bytes=p=>reviewed174(p,fs.readFileSync(p)),j=p=>JSON.parse(bytes(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=j('docs/lesson-174-handoff-baseline.json'),captured=j('docs/lesson-174-implementation-baseline.json');
const lesson=j(leaf+'lesson.json');
describe('Carole action-plan draft',()=>{
 it('appends only the action-plan composition pair after the integrated main registry',()=>{
  const p='remotion/src/Root.tsx',source=bytes(p).toString();
  const prior=source.replace(/^import \{ProblemActionPlanStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`problem-action-plan-[\s\S]+?      \)\)\}\n/,'');
  expect(prior).toBe(beforeProposed174(p).toString());
  expect(source).toContain('ProblemActionPlanStoryFil');expect(source).toContain('ProblemActionPlanStoryEn');
 });
 it('matches the seven-file pinned main baseline and preserves manifest, anchors, concepts and original decision',()=>{
  for(const [name,h]of Object.entries(baseline.target_sha256))expect(captured.files[leaf+name],name).toBe(h);
  expect(lesson.manifest).toEqual(baseline.manifest);
  expect(lesson.sections.map(s=>({id:s.id,concept_ids:s.concept_ids}))).toEqual(baseline.anchors);
  expect(lesson.coverage).toEqual(baseline.coverage);
  const c=lesson.sections.at(-1).check;
  for(const name of ['prompt_fil','prompt_en','options','correct_option_index'])expect(c[name]).toEqual(baseline.original_check[name]);
  expect(c.correct_option_index).toBe(2);
 });
 it('loads six paired screens with distinct hashed illustrations and exact Slides narration',()=>{
  const loaded=loadReferenceModule('content/training/day1-basic-competencies/modules/07-problema','public').lessons.find(l=>l.manifest.lesson_key==='problem-action-plan');
  for(const lang of ['fil','en']){
   const read=parseReferenceRead(bytes(leaf+`read.${lang}.md`).toString());
   expect(read).toHaveLength(6);
   for(const [i,s]of read.entries()){expect(loaded.revision.slides[i]['narration_'+lang]).toBe(s.body);expect(s.body).not.toMatch(/Nestor|41/);}
  }
  expect(new Set(lesson.assets.filter(a=>a.id.startsWith('action-')).map(a=>a.content_hash)).size).toBe(6);
  for(const s of lesson.sections){expect(s.asset_ids).toEqual(['action-'+s.id]);const a=lesson.assets.find(a=>a.id===s.asset_ids[0]);expect(sha(bytes('public'+a.path))).toBe(a.content_hash);expect(a.review_status).toBe('draft');}
 });
 it('retains original public bytes, sibling teaching, narration/history, UUIDs and approval receipts',()=>{
  const allowed=new Set(Object.keys(j('docs/lesson-174-proposal-receipt.json').changed_existing_files));
  for(const [p,h]of Object.entries(j('docs/lesson-174-integrated-baseline.json').files))if(!allowed.has(p))expect(sha(bytes(p)),p).toBe(h);
 },30000);
 it('uses strict exact successor guards before historical views',()=>{
  const r=j('docs/lesson-174-proposal-receipt.json'),base=j('docs/lesson-174-integrated-baseline.json').base_commit;
  const paths=Object.keys(r.changed_existing_files);
  const packed=execFileSync('git',['cat-file','--batch'],{input:paths.map(p=>base+':'+p).join('\n')+'\n',maxBuffer:32*1024*1024});
  const originals=new Map();let offset=0;
  for(const p of paths){const end=packed.indexOf(10,offset),header=packed.subarray(offset,end).toString().split(' ');expect(header[1]).toBe('blob');const size=Number(header[2]);expect(Number.isSafeInteger(size)).toBe(true);originals.set(p,packed.subarray(end+1,end+1+size));offset=end+size+2;}
  expect(offset).toBe(packed.length);
  for(const [p,e]of Object.entries(r.changed_existing_files)){
   expect(sha(bytes(p))).toBe(e.proposed_sha256);
   expect(sha(beforeProposed174(p))).toBe(e.predecessor_sha256);
   expect(beforeProposed174(p)).toEqual(originals.get(p));
   expect(()=>beforeProposed174(p,Buffer.from('changed'))).toThrow('Unpinned');
  }
  expect(r.owner_release_approval).toBe(false);
 },30000);
 it('keeps old published narration selectable and selects exact new Gemini recordings',()=>{
  const old=j('docs/lesson-174-proposal-receipt.json').changed_existing_files;
  const read=Object.fromEntries(['fil','en'].map(lang=>[lang,parseReferenceRead(old[leaf+`read.${lang}.md`].predecessor_utf8)]));
  const original=JSON.parse(old[leaf+'lesson.json'].predecessor_utf8);
  const sections=read.fil.map((s,i)=>({id:s.id,heading_fil:s.heading,heading_en:read.en[i].heading,body_fil:s.body,body_en:read.en[i].body,takeaway_fil:original.sections[i].takeaway_fil,takeaway_en:original.sections[i].takeaway_en}));
  const mf=j('content/training/day1-basic-competencies/narration.json');
  const oldNarration=j('docs/lesson-174-proposal-receipt.json').changed_existing_files['content/training/day1-basic-competencies/narration.json'].predecessor_narration.lesson;
  const current=loadReferenceModule('content/training/day1-basic-competencies/modules/07-problema','public').lessons.find(l=>l.manifest.lesson_key==='problem-action-plan');
  for(const lang of ['fil','en']){
   const selected=narrationForLesson(mf,'problem-action-plan',lang,sections);
   expect(Object.keys(selected)).toHaveLength(6);
   for(const s of sections)expect(selected[s.id].src).toBe(oldNarration.sections[s.id][lang].src);
   const fresh=narrationForLesson(mf,'problem-action-plan',lang,current.revision.read_sections);
   expect(Object.keys(fresh)).toHaveLength(6);
   for(const s of current.revision.read_sections){expect(fresh[s.id].src).not.toBe(selected[s.id].src);expect(mf.lessons['problem-action-plan'].sections[s.id][lang].voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(sha(bytes('public'+fresh[s.id].src))).toBe(mf.lessons['problem-action-plan'].sections[s.id][lang].sha256);}
  }
 });
 it('retains 50/180 timing, full guide outline, one observable indicator and paper practice alternatives',()=>{
  const indicators=j(leaf+'competency.json').observation_indicators;
  expect(indicators).toHaveLength(1);expect(indicators[0].objective_index).toBe(0);expect(Object.keys(indicators[0].levels)).toHaveLength(6);
  for(const lang of ['fil','en']){
   const g=bytes(leaf+`facilitator.${lang}.md`).toString();
   expect([...g.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);
   expect(g).toContain('35 + 50 + 45 + 50 = 180');
   expect(g).toContain('1–3');expect(g).toContain('4–6');expect(g).toContain('7–10');
   expect([...bytes(`docs/lesson-174-practice-kit.${lang}.md`).toString().matchAll(/^## /gm)]).toHaveLength(4);
  }
 });
});

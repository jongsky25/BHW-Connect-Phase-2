import {beforeProposed174} from '../lib/lesson-174-proposal.mjs';
// @vitest-environment node
import {describe,it,expect} from 'vitest';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {beforeProposed171,reviewed171} from '../lib/lesson-171-integration.mjs';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
const base='content/training/day1-basic-competencies/',leaf=base+'modules/07-problema/lessons/problem-define/';
const j=p=>JSON.parse(reviewed171(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=j('docs/lesson-171-baseline.json'),lesson=j(leaf+'lesson.json'),old=JSON.parse(baseline.target_files[leaf+'lesson.json']);
describe('Carole lesson 1.7.1 scoped draft',()=>{
 it('preserves every exact predecessor before exposing historical views and rejects changed successors',()=>{
  const receipt=j('docs/lesson-171-proposal-receipt.json');for(const[p,e]of Object.entries(receipt.changed_existing_files)){expect(sha(reviewed171(p))).toBe(e.proposed_sha256);expect(sha(beforeProposed171(p))).toBe(e.predecessor_sha256);expect(()=>beforeProposed171(p,Buffer.from('changed'))).toThrow('Unpinned');}
  for(const[p,h]of Object.entries(baseline.protected_sha256))expect(sha(beforeProposed171(p)),p).toBe(h);
 },30000);
 it('keeps identity, original anchor order and all quiz choices with correct index 2',()=>{
  expect(lesson.manifest).toEqual(baseline.manifest);expect(lesson.sections.map(s=>s.id)).toEqual(['missed-visits','worked-example','source-gap','resident-perspective','practice','check']);expect(lesson.sections.filter(s=>old.sections.some(o=>o.id===s.id)).map(s=>s.id)).toEqual(old.sections.map(s=>s.id));expect(lesson.sections.at(-1).check.options).toEqual(old.sections.at(-1).check.options);expect(lesson.sections.at(-1).check.correct_option_index).toBe(2);
 });
 it('pairs complete Read and Slides and provides hashed distinct action art before every check',()=>{
  const loaded=loadReferenceModule(base+'modules/07-problema','public').lessons.find(l=>l.manifest.lesson_key==='problem-define');
  for(const lang of ['fil','en']){const read=parseReferenceRead(fs.readFileSync(leaf+`read.${lang}.md`,'utf8'));for(const[i,s]of read.entries()){expect(loaded.revision.slides[i]['narration_'+lang]).toBe(s.body);expect(s.body).not.toMatch(/Nestor|41 anyos|Nestor, 41/);}}
  const hashes=[];for(const s of lesson.sections){const a=lesson.assets.find(a=>a.id===s.asset_ids[0]);expect(sha(fs.readFileSync('public'+a.path))).toBe(a.content_hash);expect(a.review_status).toBe('draft');expect(a.alt_fil).toBeTruthy();expect(a.alt_en).toBeTruthy();hashes.push(a.content_hash);}expect(new Set(hashes).size).toBe(6);
 });
 it('retains 35 minutes, a single observation indicator, six levels and ordered private guides',()=>{
  const i=j(leaf+'competency.json').observation_indicators;expect(i).toHaveLength(1);expect(i[0].objective_index).toBe(0);expect(Object.keys(i[0].levels)).toHaveLength(6);
  for(const lang of ['fil','en']){const g=fs.readFileSync(leaf+`facilitator.${lang}.md`,'utf8');expect([...g.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);expect(g).toContain('35 + 50 + 45 + 50 = 180');expect(g).toContain('0:00–1:00');expect(g).toContain('2:45–3:45');}
 });
 it('preserves old published narration selection and every sibling selection/history',()=>{
  const manifest=j(base+'narration.json');for(const[k,v]of Object.entries(baseline.narration.lessons))if(k!=='problem-define')expect(manifest.lessons[k],k).toEqual(v);
  const reads=Object.fromEntries(['fil','en'].map(lang=>[lang,parseReferenceRead(baseline.target_files[leaf+`read.${lang}.md`])]));const sections=reads.fil.map((s,i)=>({id:s.id,heading_fil:s.heading,heading_en:reads.en[i].heading,body_fil:s.body,body_en:reads.en[i].body,takeaway_fil:old.sections[i].takeaway_fil,takeaway_en:old.sections[i].takeaway_en}));for(const lang of ['fil','en']){const selected=narrationForLesson(manifest,'problem-define',lang,sections);for(const s of old.sections)expect(selected[s.id].src).toBe(baseline.narration.lessons['problem-define'].sections[s.id][lang].src);}
 });
 it('limits the shared module adaptation to Nestor → Carole in summaries',()=>{
  const p=base+'modules/07-problema/module.json',prior=JSON.parse(beforeProposed171(p)),current=j(p);
  for(const [key,value]of Object.entries(prior))expect(current[key],key).toEqual(key.startsWith('summary')&&typeof value==='string'?value.replaceAll('Nestor','Carole'):value);
 });
 it('appends exactly the target registry pair without changing the preceding registry bytes',()=>{
  const now=beforeProposed174('remotion/src/Root.tsx').toString(),prior=beforeProposed171('remotion/src/Root.tsx').toString();expect(now.replace(/^import \{ProblemDefineStory[^\n]+\n/,'').replace(/    \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`problem-define-[\s\S]*?      \)\)\}\n/,'')).toBe(prior);expect(now).toContain('ProblemDefineStoryFil');expect(now).toContain('ProblemDefineStoryEn');
 });
});

// @vitest-environment node
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {planReferenceNarration} from '../lib/reference-narration.mjs';
import {beforeProposed164} from './lesson-164-proposal-compat.mjs';
const base='content/training/day1-basic-competencies/',modulePath=base+'modules/06-komunikasyon/',leaf=modulePath+'lessons/communication-record/';
const bytes=p=>fs.readFileSync(p),j=p=>JSON.parse(bytes(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=j('docs/lesson-164-baseline.json'),lesson=j(leaf+'lesson.json'),ids=['sources','relevant-detail','conflicting-accounts','verify-gap','practice','check'];
describe('lesson 1.6.4 attributed recording draft',()=>{
 it('preserves the complete manifest, UUID lock and substantive original anchors',()=>{
  expect(lesson.manifest).toEqual(baseline.manifest);expect(lesson.sections.map(s=>s.id)).toEqual(ids);
  const lock=base+'locks/ltzicxyefizxoqhfuuzc.json';expect(sha(bytes(lock))).toBe(baseline.file_hashes[lock]);
  const old=JSON.parse(baseline.target_files[leaf+'lesson.json']);expect(ids.filter(id=>old.sections.some(s=>s.id===id))).toEqual(old.sections.map(s=>s.id));
  for(const s of old.sections)expect(lesson.sections.find(n=>n.id===s.id).concept_ids).toEqual(s.concept_ids);
  expect(lesson.coverage[0].id).toBe('m6.assess');
 });
 it('pairs the complete Read and Slides narration and supplies a picture before each check',()=>{
  const loaded=loadReferenceModule(modulePath,'public').lessons.find(l=>l.manifest.lesson_key==='communication-record');
  for(const lang of ['fil','en']){const read=parseReferenceRead(bytes(leaf+`read.${lang}.md`).toString());expect(read.map(s=>s.id)).toEqual(ids);for(const [i,s]of read.entries())expect(loaded.revision.slides[i]['narration_'+lang]).toBe(s.body);}
  for(const s of lesson.sections){expect(s.asset_ids.length).toBeGreaterThanOrEqual(1);const a=lesson.assets.find(a=>a.id===s.asset_ids[0]);expect(sha(bytes('public'+a.path))).toBe(a.content_hash);expect(a.review_status).toBe('draft');expect(a.alt_fil.length).toBeGreaterThan(30);expect(a.alt_en.length).toBeGreaterThan(30);}
  const portrait=lesson.assets.find(a=>a.id==='gibs-portrait');expect(portrait.content_hash).toBe('0e78ae41b8ede53907cf4807574edab773514eedd6e03324e36df4309dcf2b02');
 });
 it('retains the conflicting-account decision, all three rationales and an honest unresolved ending',()=>{
  const old=JSON.parse(baseline.target_files[leaf+'lesson.json']).sections.at(-1).check,c=lesson.sections.at(-1).check;
  expect(c.options).toEqual(old.options);expect(c.correct_option_index).toBe(1);
  for(const word of ['Una:','Ikalawa:','Ikatlo:','Sa wakas','Hindi pa nakumpirma'])expect(c.feedback_fil).toContain(word);
  for(const word of ['First:','Second:','Third:','In the ending','remain unconfirmed'])expect(c.feedback_en).toContain(word);
 });
 it('keeps one directly observed bilingual indicator and the twelve private guide headings',()=>{
  const rubric=j(leaf+'competency.json').observation_indicators;expect(rubric).toHaveLength(1);expect(rubric[0].objective_index).toBe(0);expect(Object.keys(rubric[0].levels)).toHaveLength(6);
  for(const lang of ['fil','en']){const g=bytes(leaf+`facilitator.${lang}.md`).toString();expect([...g.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);expect(g).toContain('90 + 90 + 120 + 90 + 90 = 480');expect(g).toContain('1–3');expect(g).toContain('4–6');expect(g).toContain('7–10');const kit=bytes(`docs/lesson-164-practice-kit.${lang}.md`).toString();expect([...kit.matchAll(/^## /gm)]).toHaveLength(4);expect(kit).toContain('(F)');}
 });
 it('preserves all earlier public bytes, sibling source/history and earlier approval receipts',()=>{
  const allowed=new Set([leaf+'lesson.json',leaf+'read.fil.md',leaf+'read.en.md',leaf+'slides.json',leaf+'competency.json',leaf+'facilitator.fil.md',leaf+'facilitator.en.md','remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx','scripts/lib/reference-narration.mjs',base+'narration.json']);
  for(const [p,h]of Object.entries(baseline.file_hashes))if(!allowed.has(p))expect(sha(bytes(p)),p).toBe(h);
  const m=j(base+'narration.json');for(const [key,v]of Object.entries(baseline.narration.lessons))if(key!=='communication-record')expect(m.lessons[key],key).toEqual(v);
  for(const [key,v]of Object.entries(baseline.narration.history??{}))expect(key==='communication-record'?m.history[key].slice(0,v.length):m.history[key],key).toEqual(v);
 },30000);
 it('verifies successor bytes before providing the approved historical view',()=>{
  const r=j('docs/lesson-164-proposal-receipt.json');expect(r.owner_release_approval).toBe(false);
  for(const [p,e]of Object.entries(r.changed_existing_files)){expect(sha(bytes(p)),p).toBe(e.proposed_sha256);expect(sha(beforeProposed164(p)),p).toBe(e.predecessor_sha256);}
 });
 it('selects original narration for old published text while using Gemini for every new screen',()=>{
  const old=JSON.parse(baseline.target_files[leaf+'lesson.json']);const read=Object.fromEntries(['fil','en'].map(l=>[l,parseReferenceRead(baseline.target_files[leaf+`read.${l}.md`])]));
  const sections=read.fil.map((s,i)=>({id:s.id,heading_fil:s.heading,heading_en:read.en[i].heading,body_fil:s.body,body_en:read.en[i].body,takeaway_fil:old.sections[i].takeaway_fil,takeaway_en:old.sections[i].takeaway_en}));
  const m=j(base+'narration.json');for(const lang of ['fil','en']){const selected=narrationForLesson(m,'communication-record',lang,sections);for(const s of old.sections)expect(selected[s.id].src).toBe(baseline.narration.lessons['communication-record'].sections[s.id][lang].src);}
  const loaded=loadReferenceModule(modulePath,'public').lessons.find(l=>l.manifest.lesson_key==='communication-record');const plan=planReferenceNarration([{key:'06-komunikasyon',lessons:[loaded]}],m,p=>sha(bytes('public'+p)));expect(plan).toHaveLength(12);expect(plan.every(p=>p.provider==='gemini')).toBe(true);
 });
 it('appends exactly two compositions without altering the prior registry source/order',()=>{
  const s=bytes('remotion/src/Root.tsx').toString();const restored=s.replace(/^import \{CommunicationRecordStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`communication-record-[\s\S]+?      \)\)\}\n/,'');expect(restored).toBe(baseline.registry_source);
 });
});

import {lesson165View} from '../lib/lesson-165-integration.mjs';
// @vitest-environment node
import {describe,it,expect} from 'vitest';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {beforeProposed165} from './lesson-165-proposal-compat.mjs';import {planReferenceNarration} from '../lib/reference-narration.mjs';
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-handoff/',read=p=>lesson165View(p,'reviewed165'),j=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=j('docs/lesson-165-baseline.json'),receipt=j('docs/lesson-165-proposal-receipt.json'),lesson=j(leaf+'lesson.json');
describe('scoped lesson 1.6.5 draft',()=>{
 it('retains the complete manifest, old anchors and coverage while adding confirmation',()=>{
  const old=JSON.parse(beforeProposed165(leaf+'lesson.json'));expect(lesson.manifest).toEqual(old.manifest);
  expect(lesson.sections.map(s=>s.id)).toEqual(['handoff','audience','meeting','confirm-next-step','practice','check']);
  expect(lesson.sections.filter(s=>s.id!=='confirm-next-step').map(s=>s.id)).toEqual(old.sections.map(s=>s.id));
  expect(lesson.coverage.map(c=>c.id)).toEqual(['m6.record']);expect(lesson.coverage[0].source_ids).toEqual(old.coverage[0].source_ids);
  const slides=j(leaf+'slides.json');for(const lang of ['fil','en'])for(const [i,s]of parseReferenceRead(read(leaf+'read.'+lang+'.md').toString()).entries())expect(slides[i]['narration_'+lang]).toBe(s.body);
 });
 it('provides distinct draft art before the unchanged three-way decision intent',()=>{
  expect(lesson.assets.find(a=>a.id==='gibs-portrait').content_hash).toBe('0e78ae41b8ede53907cf4807574edab773514eedd6e03324e36df4309dcf2b02');
  const paths=[];for(const s of lesson.sections){const art=lesson.assets.find(a=>a.id===s.asset_ids.at(-1));expect(sha(read('public'+art.path))).toBe(art.content_hash);expect(art.review_status).toBe('draft');paths.push(art.path);}
  expect(new Set(paths).size).toBe(6);const old=JSON.parse(beforeProposed165(leaf+'lesson.json')).sections.at(-1).check,c=lesson.sections.at(-1).check;expect(c.options).toEqual(old.options);expect(c.correct_option_index).toBe(old.correct_option_index);
  for(const word of ['Una:','Ikalawa:','Ikatlo:','Sa wakas'])expect(c.feedback_fil).toContain(word);for(const word of ['First:','Second:','Third:','In the ending'])expect(c.feedback_en).toContain(word);
  expect(j(leaf+'slides.json').at(-1).display_en).not.toBe(lesson.sections.at(-1).takeaway_en);
 });
 it('preserves every protected source, prior public byte and release receipt',()=>{
  for(const [p,e]of Object.entries(baseline.files))expect(sha(receipt.changed_existing_files[p]?beforeProposed165(p):read(p)),p).toBe(e.sha256);
  for(const [p,e]of Object.entries(receipt.changed_existing_files)){expect(sha(read(p)),p).toBe(e.proposed_sha256);expect(sha(Buffer.from(e.predecessor_utf8)),p).toBe(e.predecessor_sha256);}
 },30000);
 it('keeps one observable indicator and complete 90-minute bilingual practice',()=>{
  const indicators=j(leaf+'competency.json').observation_indicators;expect(indicators).toHaveLength(1);expect(indicators[0].objective_index).toBe(0);expect(Object.keys(indicators[0].levels)).toHaveLength(6);
  for(const lang of ['fil','en']){const g=read(leaf+'facilitator.'+lang+'.md').toString();expect([...g.matchAll(/^## \[([^\]]+)\]/gm)].map(x=>x[1])).toEqual(FACILITATOR_SECTION_IDS);expect(g).toContain('90 + 90 + 120 + 90 + 90 = 480');expect(g).toContain('1–3');expect(g).toContain('4–6');expect(g).toContain('7–10');expect(read('docs/lesson-165-practice-kit.'+lang+'.md').toString().match(/^## /gm)).toHaveLength(4);}
 });
 it('retains the approved registry source/order and appends only two compositions',()=>{
  const actual=read('remotion/src/Root.tsx').toString(),old=beforeProposed165('remotion/src/Root.tsx').toString();
  const restored=actual.replace(/^import \{CommunicationHandoffStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`communication-handoff-[\s\S]+?      \)\)\}\n/,'');expect(restored).toBe(old);
 });
 it('keeps the target on Gemini Kore without changing sibling plans',()=>{
  const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public'),m=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/narration.json'));const p=planReferenceNarration([{key:'06-komunikasyon',lessons}],m,src=>sha(read('public'+src)));
  const target=p.filter(i=>i.lessonKey==='communication-handoff');expect(target).toHaveLength(12);expect(target.every(i=>i.voice==='gemini:gemini-3.8-flash-tts:Kore')).toBe(true);expect(p.filter(i=>i.lessonKey!=='communication-handoff').every(i=>i.action==='skip')).toBe(true);
 });
 it('selects all ten approved tracks for the old published text',()=>{
  const old=JSON.parse(beforeProposed165(leaf+'lesson.json')),reads=Object.fromEntries(['fil','en'].map(lang=>[lang,parseReferenceRead(beforeProposed165(leaf+'read.'+lang+'.md').toString())]));
  const sections=reads.fil.map((f,i)=>({id:f.id,heading_fil:f.heading,heading_en:reads.en[i].heading,body_fil:f.body,body_en:reads.en[i].body,takeaway_fil:old.sections[i].takeaway_fil,takeaway_en:old.sections[i].takeaway_en}));
  const before=JSON.parse(beforeProposed165('content/training/day1-basic-competencies/narration.json')),actual=j('content/training/day1-basic-competencies/narration.json');
  for(const lang of ['fil','en']){const selected=narrationForLesson(actual,'communication-handoff',lang,sections);expect(Object.keys(selected)).toEqual(['handoff','audience','meeting','practice','check']);for(const id of Object.keys(selected))expect(selected[id].src).toBe(before.lessons['communication-handoff'].sections[id][lang].src);}
 });
});

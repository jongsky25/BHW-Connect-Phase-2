import {communicationView} from '../lib/communication-integration.mjs';
// @vitest-environment node
import {describe,it,expect} from 'vitest';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {beforeProposed163} from './lesson-163-proposal-compat.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),j=p=>JSON.parse(fs.readFileSync(p)),leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/';
const b=j('docs/lesson-163-baseline.json'),lesson=j(leaf+'lesson.json'),ids=['teach-back','family-planning','distress','smoking','practice','check'];
describe('lesson 1.6.3 empathy and clear explanations',()=>{
 it('keeps the entire manifest, ordered anchors/coverage and paired full narration',()=>{
  expect(lesson.manifest).toEqual(b.manifest);expect(lesson.sections.map(s=>s.id)).toEqual(ids);
  expect(lesson.coverage).toEqual(JSON.parse(b.target_files[leaf+'lesson.json']).coverage);
  const a=loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public').lessons.find(l=>l.manifest.lesson_key==='communication-explain');
  for(const lang of ['fil','en'])for(const [i,s]of parseReferenceRead(fs.readFileSync(leaf+'read.'+lang+'.md','utf8')).entries())expect(a.revision.slides[i]['narration_'+lang]).toBe(s.body);
 });
 it('shows distinct hash-verified teaching actions and preserves the index2 repair check',()=>{
  expect(new Set(lesson.sections.map(s=>s.asset_ids.at(-1))).size).toBe(6);
  for(const s of lesson.sections){expect(s.asset_ids).toHaveLength(s.id==='teach-back'?2:1);const a=lesson.assets.find(a=>a.id===s.asset_ids.at(-1));expect(sha(fs.readFileSync('public'+a.path))).toBe(a.content_hash);expect(a.review_status).toBe(fs.existsSync('docs/lesson-163-owner-approval.json')?'approved':'draft');}
  const checkArt=lesson.assets.find(a=>a.id==='explain-check');for(const lang of ['fil','en'])expect(checkArt['caption_'+lang]).not.toBe(lesson.sections.at(-1)['takeaway_'+lang]);
  expect(lesson.sections[0].asset_ids[0]).toBe('gibs-portrait');const c=lesson.sections.at(-1).check;expect(c.correct_option_index).toBe(2);expect(c.options).toEqual(JSON.parse(b.target_files[leaf+'lesson.json']).sections.at(-1).check.options);
  for(const text of ['Una:','Ikalawa:','Ikatlo:','Sa wakas','wala pang kumpirmadong appointment'])expect(c.feedback_fil).toContain(text);
  for(const text of ['First:','Second:','Third:','In the ending','no confirmed appointment'])expect(c.feedback_en).toContain(text);
 });
 it('preserves protected history and verifies predecessor bytes before historical guards',async()=>{
  await import('../lesson-163-preservation.mjs');
  const p=j('docs/lesson-163-proposal-receipt.json');for(const [file,e]of Object.entries(p.changed_existing_files)){expect(sha(communicationView(file,'reviewed163'))).toBe(e.proposed_sha256);expect(sha(beforeProposed163(file))).toBe(e.predecessor_sha256);}
 });
 it('retains one indicator, twelve guide headings and a120-minute/480-minute allocation',()=>{
  const co=j(leaf+'competency.json').observation_indicators;expect(co).toHaveLength(1);expect(co[0].objective_index).toBe(0);expect(Object.keys(co[0].levels)).toHaveLength(6);
  for(const lang of ['fil','en']){const g=fs.readFileSync(leaf+'facilitator.'+lang+'.md','utf8');expect([...g.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);expect(g).toContain('120');expect(g).toContain('480');expect(fs.readFileSync('docs/lesson-163-practice-kit.'+lang+'.md','utf8').split(/^## /m)).toHaveLength(6);}
 });
 it('selects all twelve old tracks for the unchanged old text after the proposal',()=>{
  const old=JSON.parse(b.target_files[leaf+'lesson.json']),read=Object.fromEntries(['fil','en'].map(l=>[l,parseReferenceRead(b.target_files[leaf+'read.'+l+'.md'])]));
  const sections=read.fil.map((f,i)=>({id:f.id,heading_fil:f.heading,heading_en:read.en[i].heading,body_fil:f.body,body_en:read.en[i].body,takeaway_fil:old.sections[i].takeaway_fil,takeaway_en:old.sections[i].takeaway_en}));
  const m=j('content/training/day1-basic-competencies/narration.json');
  for(const lang of ['fil','en']){const tracks=narrationForLesson(m,'communication-explain',lang,sections);expect(Object.keys(tracks)).toEqual(ids);for(const id of ids)expect(tracks[id].src).toBe(b.target_narration.sections[id][lang].src);}
 });
 it('appends exactly two compositions without changing any previous registry byte',()=>{
  const s=communicationView('remotion/src/Root.tsx','reviewed163').toString();const prior=s.replace(/^import \{CommunicationExplainStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`communication-explain-[\s\S]+?      \)\)\}\n/,'');expect(prior).toBe(b.registry_source);
 });
});

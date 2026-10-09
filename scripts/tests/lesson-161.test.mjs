import {beforeIntegratedCommunication} from './communication-integration-compat.mjs';
// @vitest-environment node
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {planReferenceNarration} from '../lib/reference-narration.mjs';
const root=path.resolve(import.meta.dirname,'../..'),base='content/training/day1-basic-competencies/modules/06-komunikasyon/',leaf=base+'lessons/communication-listen/';
const bytes=p=>beforeIntegratedCommunication(p),j=p=>JSON.parse(bytes(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=j('docs/lesson-161-baseline.json'),lesson=j(leaf+'lesson.json');
const approval=fs.existsSync(root+'/docs/lesson-161-owner-approval.json')?j('docs/lesson-161-owner-approval.json'):null;
describe('lesson 1.6.1 Gibs listening draft',()=>{
 it('preserves identity, substantive old anchors and bilingual concept equivalence',()=>{
  expect(lesson.manifest).toEqual(baseline.manifest);
  expect(lesson.sections.map(s=>s.id)).toEqual(['liza','permission','listen','profile','practice','check']);
  const loaded=loadReferenceModule(root+'/'+base,root+'/public').lessons.find(l=>l.manifest.lesson_key==='communication-listen');
  for(const lang of ['fil','en']){const read=parseReferenceRead(bytes(leaf+'read.'+lang+'.md').toString());for(const [i,s] of read.entries())expect(loaded.revision.slides[i]['narration_'+lang]).toBe(s.body);}
 });
 it('offers a picture before the check and complete bilingual rationale and ending',()=>{
  expect(lesson.sections).toHaveLength(6);
  for(const s of lesson.sections){expect(s.asset_ids).toHaveLength(1);const art=lesson.assets.find(a=>a.id===s.asset_ids[0]);expect(sha(bytes('public'+art.path))).toBe(art.content_hash);expect(art.alt_fil.length).toBeGreaterThan(30);expect(art.alt_en.length).toBeGreaterThan(30);expect(art.review_status).toBe(approval?'approved':'draft');}
  const c=lesson.sections.at(-1).check;expect(c.correct_option_index).toBe(1);expect(c.options).toHaveLength(3);
  for(const word of ['Una:','Ikalawa:','Ikatlo:','Sa wakas'])expect(c.feedback_fil).toContain(word);
  for(const word of ['First:','Second:','Third:','In the ending'])expect(c.feedback_en).toContain(word);
 });
 it('keeps one observable bilingual indicator, 90-minute practice and all guide sections',()=>{
  const indicators=j(leaf+'competency.json').observation_indicators;expect(indicators).toHaveLength(1);expect(indicators[0].objective_index).toBe(0);expect(Object.keys(indicators[0].levels)).toHaveLength(6);
  for(const lang of ['fil','en']){const g=bytes(leaf+'facilitator.'+lang+'.md').toString();expect([...g.matchAll(/^## \[([^\]]+)\]/gm)].map(x=>x[1])).toEqual(FACILITATOR_SECTION_IDS);expect(g).toContain('90');expect(g).toContain('480');expect(g).not.toContain('Draft for review');expect(bytes('docs/lesson-161-practice-kit.'+lang+'.md').toString()).toContain('Gibs');}
 });
 it('retains every earlier public byte, UUID lock, receipts and protected sources',()=>{
  for(const [p,h]of Object.entries(baseline.file_hashes)){if(p.startsWith('public/')||p.includes('/locks/')||p.startsWith('docs/lesson-15')||p.startsWith(base)&&!p.includes('/lessons/')&&!['lesson.fil.md','lesson.en.md'].some(f=>p.endsWith('/'+f)))expect(sha(p.endsWith('/module.json')?Buffer.from(bytes(p).toString().replaceAll('Gibs','Mila')):bytes(p)),p).toBe(h);}
 },30000);
 it('limits sibling edits to Gibs continuity and portrait references',()=>{
  for(const [p,h]of Object.entries(baseline.file_hashes)){
   if(!p.startsWith(base+'lessons/')||p.startsWith(leaf))continue;
   let text=bytes(p).toString().replaceAll('Gibs','Mila');
   if(p.endsWith('lesson.json')){const data=JSON.parse(text);data.assets=data.assets.filter(a=>a.id!=='gibs-portrait');for(const s of data.sections)s.asset_ids=s.asset_ids.filter(id=>id!=='gibs-portrait');text=JSON.stringify(data,null,2)+'\n';}
   if(p.endsWith('slides.json')){const data=JSON.parse(text);for(const s of data)s.asset_ids=s.asset_ids.filter(id=>id!=='gibs-portrait');text=JSON.stringify(data,null,2)+'\n';}
   expect(sha(Buffer.from(text)),p).toBe(h);
  }
 });
 it('verifies exact draft successor bytes before historical predecessor views',()=>{
  const receipt=j('docs/lesson-161-proposal-receipt.json');expect(receipt.owner_release_approval).toBe(false);expect(receipt.status).toBe('draft');
  for(const [p,e]of Object.entries(receipt.changed_existing_files)){expect(sha(bytes(p)),p).toBe(approval?.approved_source_sha256[p]??e.proposed_sha256);expect(sha(Buffer.from(e.predecessor_utf8)),p).toBe(e.predecessor_sha256);}
 });
 it('keeps default permission narration on Gemini without changing other lesson styles',()=>{
  const loaded=loadReferenceModule(root+'/'+base,root+'/public').lessons.find(l=>l.manifest.lesson_key==='communication-listen');
  const plan=planReferenceNarration([{key:'06-komunikasyon',lessons:[loaded]}],j('content/training/day1-basic-competencies/narration.json'),src=>sha(bytes('public'+src)));
  expect(plan).toHaveLength(12);expect(plan.every(p=>p.provider==='gemini'&&p.voice==='gemini:gemini-3.8-flash-tts:Kore')).toBe(true);
 });
 it('selects all ten original tracks for the old five-screen published text',()=>{
  const receipt=j('docs/lesson-161-proposal-receipt.json');const oldLesson=JSON.parse(receipt.changed_existing_files[leaf+'lesson.json'].predecessor_utf8);
  const oldRead=Object.fromEntries(['fil','en'].map(lang=>[lang,parseReferenceRead(receipt.changed_existing_files[leaf+'read.'+lang+'.md'].predecessor_utf8)]));
  const sections=oldRead.fil.map((f,i)=>({id:f.id,heading_fil:f.heading,heading_en:oldRead.en[i].heading,body_fil:f.body,body_en:oldRead.en[i].body,takeaway_fil:oldLesson.sections[i].takeaway_fil,takeaway_en:oldLesson.sections[i].takeaway_en}));
  const m=j('content/training/day1-basic-competencies/narration.json');
  for(const lang of ['fil','en']){const selected=narrationForLesson(m,'communication-listen',lang,sections);expect(Object.keys(selected)).toEqual(['liza','listen','profile','practice','check']);for(const id of Object.keys(selected))expect(selected[id].src).toBe(baseline.narration.lessons['communication-listen'].sections[id][lang].src);}
 });
 it('appends exactly two compositions while retaining prior registry order and source',()=>{
  const s=bytes('remotion/src/Root.tsx').toString();const restored=s.replace(/^import \{CommunicationListenStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`communication-listen-[\s\S]+?      \)\)\}\n/,'');expect(restored).toBe(baseline.registry_source);
 });
});

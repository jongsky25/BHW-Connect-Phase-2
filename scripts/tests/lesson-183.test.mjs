import {release183View} from '../lib/lesson-183-release-integration.mjs';
// @vitest-environment node
import {it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {beforeProposed183} from '../lib/lesson-183-integration.mjs';
import {parseReferenceRead,loadReferenceModule} from '../lib/reference-content.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
const sha=b=>createHash('sha256').update(b).digest('hex');
it('rejects unpinned successors and recovers only exact protected predecessors',()=>{
 const receipt=JSON.parse(fs.readFileSync('docs/lesson-183-proposal-receipt.json'));
 for(const [p,e]of Object.entries(receipt.changed_existing_files)){
  expect(sha(release183View(p,'reviewed183'))).toBe(e.proposed_sha256);
  expect(sha(beforeProposed183(p))).toBe(e.predecessor_sha256);
  expect(()=>beforeProposed183(p,Buffer.from('unpinned mutation'))).toThrow('Unpinned');
 }
 expect(()=>beforeProposed183('unrelated',Buffer.from('untouched'))).not.toThrow();
});
it('selects byte-preserved old recordings for old text and all twelve current recordings',()=>{
 const b=JSON.parse(fs.readFileSync('docs/lesson-183-handoff-baseline.json'));
 const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-prepare/';
 const old=JSON.parse(b.target_files_utf8[leaf+'lesson.json']);
 const reads=Object.fromEntries(['fil','en'].map(l=>[l,parseReferenceRead(b.target_files_utf8[leaf+'read.'+l+'.md'])]));
 const sections=reads.fil.map((s,i)=>({id:s.id,heading_fil:s.heading,heading_en:reads.en[i].heading,body_fil:s.body,body_en:reads.en[i].body,takeaway_fil:old.sections[i].takeaway_fil,takeaway_en:old.sections[i].takeaway_en}));
 const manifest=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/narration.json'));
 const current=loadReferenceModule('content/training/day1-basic-competencies/modules/08-osh','public').lessons.find(l=>l.manifest.lesson_key==='safety-prepare');
 for(const language of ['fil','en']){
  const prior=narrationForLesson(manifest,'safety-prepare',language,sections);
  expect(Object.keys(prior)).toEqual(reads.fil.map(s=>s.id));
  for(const [id,t]of Object.entries(prior)){expect(t.src).toBe(b.target_narration.sections[id][language].src);expect(sha(fs.readFileSync('public'+t.src))).toBe(b.target_narration.sections[id][language].sha256);}
  expect(Object.keys(narrationForLesson(manifest,'safety-prepare',language,current.revision.read_sections))).toEqual(current.revision.read_sections.map(s=>s.id));
 }
});

// @vitest-environment node
import {it,expect} from 'vitest';
import fs from 'node:fs';
import {beforeLesson193} from '../lib/lesson-193-integration.mjs';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/';
const baseline=JSON.parse(fs.readFileSync('docs/lesson-193-handoff-baseline.json'));
const current=JSON.parse(fs.readFileSync(leaf+'lesson.json'));
it('preserves saved identities, objectives, all three decisions and the complete rubric',()=>{
 const old=JSON.parse(baseline.target_files_utf8[leaf+'lesson.json']);expect(current.manifest).toEqual(old.manifest);expect(current.coverage).toEqual(old.coverage);
 expect(current.sections.map(s=>s.id)).toEqual(old.sections.map(s=>s.id));
 for(const [i,s]of current.sections.entries())if(s.check)for(const field of ['prompt_fil','prompt_en','options','correct_option_index'])expect(s.check[field]).toEqual(old.sections[i].check[field]);
 expect(JSON.parse(fs.readFileSync(leaf+'competency.json'))).toEqual(baseline.original_competency);
});
it('pairs all fourteen full teaching bodies while keeping summaries shorter and twelve private-guide anchors',()=>{
 const target=loadReferenceModule('content/training/day1-basic-competencies/modules/09-sustainable-practices','public').lessons.find(l=>l.manifest.lesson_key==='resources-monitor');
 for(const [i,s]of target.revision.read_sections.entries())for(const lang of ['fil','en']){
  expect(target.revision.slides[i]['narration_'+lang]).toBe(s['body_'+lang]);expect(target.revision.slides[i]['display_'+lang].length).toBeLessThan(s['body_'+lang].length);
 }
 for(const lang of ['fil','en'])expect([...fs.readFileSync(leaf+`facilitator.${lang}.md`,'utf8').matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);
});
it('rejects every unpinned historical successor and returns exact predecessors without masking current teaching',()=>{
 const r=JSON.parse(fs.readFileSync('docs/lesson-193-proposal-receipt.json'));
 for(const [p,e]of Object.entries(r.changed_existing_files)){
  expect(beforeLesson193(p).toString()).toBe(e.predecessor_utf8);
  expect(()=>beforeLesson193(p,Buffer.from('unreviewed mutation'))).toThrow('Unpinned');
 }
 expect(fs.readFileSync(leaf+'read.en.md','utf8')).toContain('Charlaine');
 expect(beforeLesson193(leaf+'read.en.md').toString()).toContain('Elena');
});

it('selects fourteen current recordings and retains fourteen exact old published recordings',()=>{
 const manifest=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/narration.json'));
 const target=loadReferenceModule('content/training/day1-basic-competencies/modules/09-sustainable-practices','public').lessons.find(l=>l.manifest.lesson_key==='resources-monitor');
 const old=JSON.parse(baseline.target_files_utf8[leaf+'lesson.json']);
 const bodies=Object.fromEntries(['fil','en'].map(lang=>[lang,parseReferenceRead(baseline.target_files_utf8[leaf+`read.${lang}.md`])]));
 const sections=old.sections.map((s,i)=>({...s,heading_fil:bodies.fil[i].heading,body_fil:bodies.fil[i].body,heading_en:bodies.en[i].heading,body_en:bodies.en[i].body}));
 for(const language of ['fil','en']){
  const previous=narrationForLesson(manifest,'resources-monitor',language,sections);
  const published=JSON.parse(fs.readFileSync('docs/lesson-193-published-snapshot.json')).rows.find(r=>r.lesson.lesson_key==='resources-monitor');
  const production=narrationForLesson(manifest,'resources-monitor',language,published.revision.read_sections);
  expect(production).toEqual(previous);
  const current=narrationForLesson(manifest,'resources-monitor',language,target.revision.read_sections);
  expect(Object.keys(previous)).toHaveLength(7);expect(Object.keys(current)).toHaveLength(7);
  for(const s of old.sections){expect(previous[s.id].src).not.toBe(current[s.id].src);expect(fs.existsSync('public'+previous[s.id].src)).toBe(true);expect(current[s.id].src).toBe(manifest.lessons['resources-monitor'].sections[s.id][language].src);}
 }
});

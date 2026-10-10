// @vitest-environment node
import {it,expect} from 'vitest';
import fs from 'node:fs';
import {beforeLesson193} from '../lib/lesson-193-integration.mjs';
import {loadReferenceModule,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
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

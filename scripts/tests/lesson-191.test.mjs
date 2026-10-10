// @vitest-environment node
import fs from 'node:fs';import assert from 'node:assert/strict';import {it} from 'vitest';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {beforeLesson191} from '../lib/lesson-191-integration.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration';
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-audit/';
const j=p=>JSON.parse(fs.readFileSync(p)),baseline=j('docs/lesson-191-handoff-baseline.json'),lesson=j(leaf+'lesson.json'),slides=j(leaf+'slides.json');
it('preserves the saved lesson identity, both original decisions and all coverage while adding one named screen',()=>{
 assert.deepEqual(lesson.manifest,baseline.manifest);assert.deepEqual(lesson.sections.map(s=>s.id),['elena','inventory','seven-s','evidence-before-order','practice','check']);
 const old=JSON.parse(baseline.target_files_utf8[leaf+'lesson.json']);for(const s of old.sections){const now=lesson.sections.find(n=>n.id===s.id);assert.deepEqual(now.concept_ids,s.concept_ids);if(s.check)for(const k of ['prompt_fil','prompt_en','options','correct_option_index'])assert.deepEqual(now.check[k],s.check[k]);}
 for(const c of old.coverage){const now=lesson.coverage.find(n=>n.id===c.id);assert.deepEqual(now.read_ids.filter(id=>id!=='evidence-before-order'),c.read_ids);assert.deepEqual(now.slide_ids.filter(id=>id!=='slide-evidence-before-order'),c.slide_ids);}
});
it('pairs complete bilingual teaching, keeps answers out of pre-decision text and provides all post-choice rationales',()=>{
 for(const lang of ['fil','en']){const read=parseReferenceRead(fs.readFileSync(leaf+'read.'+lang+'.md','utf8'));for(const[i,s]of read.entries()){assert.equal(slides[i]['narration_'+lang],s.body);assert(s.body.length>400);assert(!/Elena|38/.test(s.body));}for(const s of lesson.sections.filter(s=>s.check)){for(const n of ['1.','2.','3.'])assert(s.check['feedback_'+lang].includes(n));assert(s.check['feedback_'+lang].includes('Charlaine'));}}
});
it('retains the observed-performance rubric and all twelve guide headings with realistic sampling',()=>{
 assert.deepEqual(j(leaf+'competency.json'),baseline.original_competency);
 for(const lang of ['fil','en']){const guide=fs.readFileSync(leaf+'facilitator.'+lang+'.md','utf8');assert.deepEqual([...guide.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1]),FACILITATOR_SECTION_IDS);for(const n of ['180','27','17–21','23–27','29–33'])assert(guide.includes(n));}
});
it('rejects unpinned successors and keeps historical source recovery separate from the current narration selector',()=>{
 const p=leaf+'read.fil.md';assert.throws(()=>beforeLesson191(p,Buffer.from('mutation')),/Unpinned/);assert.equal(beforeLesson191(p).toString(),baseline.target_files_utf8[p]);
 const mf=j('content/training/day1-basic-competencies/narration.json');const current=loadReferenceModule('content/training/day1-basic-competencies/modules/09-sustainable-practices','public').lessons.find(l=>l.manifest.lesson_key==='resources-audit');
 // When new media is present, old published text must still select its original tracks.
 if(mf.history?.['resources-audit']?.length){const old=JSON.parse(baseline.target_files_utf8[leaf+'lesson.json']);for(const lang of ['fil','en']){const read=parseReferenceRead(baseline.target_files_utf8[leaf+'read.'+lang+'.md']);const sections=old.sections.map((s,i)=>({...s,['heading_'+lang]:read[i].heading,['body_'+lang]:read[i].body}));const selected=narrationForLesson(mf,'resources-audit',lang,sections);assert.equal(Object.keys(selected).length,5);assert.equal(Object.keys(narrationForLesson(mf,'resources-audit',lang,current.revision.read_sections)).length,6);}}
});

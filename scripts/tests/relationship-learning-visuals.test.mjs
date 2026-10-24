// @vitest-environment node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {loadReferenceModule,contentHash} from '../lib/reference-content.mjs';
import {beforeFeedbackRelationshipVisual} from '../lib/feedback-relationship-preservation.mjs';

it('binds each diagram to approved Read/Slides and keeps answer choices out of the practice visual',()=>{
 const d=JSON.parse(fs.readFileSync('src/lib/elearning/relationship-learning-visuals.json'));
 const lesson=loadReferenceModule('content/training/day1-basic-competencies/modules/05-bhw-at-barangay','public').lessons.find(l=>l.manifest.lesson_key===d.lesson_key);
 expect(contentHash(lesson)).toBe(d.content_hash);
 for(const [id,diagram]of Object.entries(d.diagrams)){
  const read=lesson.revision.read_sections.find(s=>s.id===id),slide=lesson.revision.slides.find(s=>s.id==='slide-'+id);
  expect(slide.asset_ids).toEqual([]);
  for(const lang of ['en','fil']){
   const v=diagram[lang],body=read['body_'+lang],lines=slide['display_'+lang].split('\n');
   if(diagram.kind==='roles'){expect(v.cards.map(c=>c.label)).toEqual(lines);for(const c of v.cards)expect(body).toContain(c.detail);expect(v.caption).toBe(body.split('\n\n')[0]);}
   if(diagram.kind==='known'){for(const c of v.cards)expect(body).toContain(c.detail);expect(v.caption).toBe(read['takeaway_'+lang]);}
   if(diagram.kind==='contacts'){expect(v.cards.map(c=>c.label+': '+c.detail)).toEqual(lines.slice(0,2));expect(v.question).toBe(lines[2]);expect(body).toContain(v.caption);}
   if(diagram.kind==='practice'){for(const c of v.cards)expect(body).toContain(c.label);expect(body).toContain(v.caption);for(const option of read.check.options)expect(JSON.stringify(v)).not.toContain(option[lang]);expect(JSON.stringify(v)).not.toContain(read.check['feedback_'+lang]);}
  }
 }
 expect(Object.keys(d.diagrams)).toHaveLength(4);
});
it('retains the complete previously released shared reader for historical checks',()=>{
 const r=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-4.1d-reader-preservation.json'));
 expect(beforeFeedbackRelationshipVisual(r.path)).toEqual(execFileSync('git',['show',r.base_commit+':'+r.path]));
});

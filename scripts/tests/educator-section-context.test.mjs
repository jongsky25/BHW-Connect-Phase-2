import {beforeFeedbackNarrationPreferences} from '../lib/feedback-narration-preservation.mjs';
// @vitest-environment node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {loadReferenceModule,contentHash} from '../lib/reference-content.mjs';

it('traces all four slide context excerpts to the same approved Read section',()=>{
 const d=JSON.parse(fs.readFileSync('src/lib/elearning/educator-section-context.json'));
 const lesson=loadReferenceModule('content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw','public').lessons.find(l=>l.manifest.lesson_key===d.lesson_key);
 expect(contentHash(lesson)).toBe(d.content_hash);
 expect(Object.keys(d.sections)).toEqual(['educator-scene','body-environment','life-stages','all-sectors']);
 for(const [id,context]of Object.entries(d.sections)){
  const read=lesson.revision.read_sections.find(s=>s.id===id),slide=lesson.revision.slides.find(s=>s.id===id+'-slide');
  expect(read.check).toBeNull();expect(slide.check).toBeNull();expect(slide.heading_en).toBe(read.heading_en);expect(slide.heading_fil).toBe(read.heading_fil);
  for(const lang of ['en','fil']){expect(read['body_'+lang]).toContain(context[lang].excerpt);expect(context[lang].steps).toHaveLength(4);}
 }
 expect(d.sections['body-environment'].en.excerpt).toContain('reach health services');
 expect(d.sections['body-environment'].en.excerpt).toContain('materials approved');
 expect(d.sections['life-stages'].en.excerpt).toContain('An infant’s caregiver');
});
it('retains the entire released reader, lesson and media sources unchanged',()=>{
 const base='c5cea8e9ecb9b368a494d032c97f0d0f5b18f0be',path='src/components/elearning/reference-lessons.tsx';
 expect(beforeFeedbackNarrationPreferences(path)).toEqual(execFileSync('git',['show',base+':'+path]));
 expect(execFileSync('git',['diff',base,'--','content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-health-educator','public/training/bhw-1-1'])).toHaveLength(0);
});

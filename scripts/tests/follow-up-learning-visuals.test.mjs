// @vitest-environment node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {loadReferenceModule,contentHash} from '../lib/reference-content.mjs';

it('traces every diagram to approved Read and Slides without inferring a timeline or outcome',()=>{
 const d=JSON.parse(fs.readFileSync('src/lib/elearning/follow-up-learning-visuals.json'));
 const lesson=loadReferenceModule('content/training/day1-basic-competencies/modules/04-ra7883','public').lessons.find(l=>l.manifest.lesson_key===d.lesson_key);
 expect(contentHash(lesson)).toBe(d.content_hash);
 expect(Object.keys(d.diagrams)).toEqual(['known-and-unknown','section-7','next-contact-plan']);
 for(const [id,diagram]of Object.entries(d.diagrams))for(const lang of ['en','fil']){
  const read=lesson.revision.read_sections.find(s=>s.id===id),slide=lesson.revision.slides.find(s=>s.id==='slide-'+id),v=diagram[lang],body=read['body_'+lang];
  expect(v.title).toBe(read['heading_'+lang]);expect(read.check).toBeNull();expect(slide.check).toBeNull();
  for(const card of v.cards){if(card.detail)expect(body).toContain(card.detail);else expect(body).toContain(card.label);}
  if(diagram.kind==='questions'){expect(v.cards.map(c=>c.label)).toEqual(slide['display_'+lang].split('\n'));expect(v.cards[2].detail).toContain(lang==='en'?'Waiting does not prove loss.':'Hindi patunay ng pagkawala ang paghihintay.');}
  else if(diagram.kind==='response')expect(body).toContain(v.caption);
  else {expect(v.caption).toContain(body.split('\n\n')[0]);expect(v.caption).toContain(lang==='en'?'Use no private details or patient record.':'Walang pribadong detalye o patient record.');}
 }
});
it('leaves the complete approved shared reader unchanged',()=>{
 const path='src/components/elearning/reference-lessons.tsx';
 expect(fs.readFileSync(path)).toEqual(execFileSync('git',['show','dc7a8d90ba64134de3623e8778bbc2545a650917:'+path]));
});

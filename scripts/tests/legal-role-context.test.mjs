// @vitest-environment node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {loadReferenceModule,contentHash} from '../lib/reference-content.mjs';

it('traces every role/definition card and legal link to the approved lesson',()=>{
 const d=JSON.parse(fs.readFileSync('src/lib/elearning/legal-role-context.json'));
 const lesson=loadReferenceModule('content/training/day1-basic-competencies/modules/04-ra7883','public').lessons.find(l=>l.manifest.lesson_key===d.lesson_key);
 expect(contentHash(lesson)).toBe(d.content_hash);
 expect(Object.keys(d.panels)).toEqual(['section-1','section-2','roles-and-authority']);
 const scene=lesson.revision.assets.find(a=>a.id===d.scene.id);expect(scene.path).toBe(d.scene.path);expect(scene.content_hash).toBe(d.scene.content_hash);expect(scene.alt_en).toContain('health-team support person');
 expect(lesson.revision.sources.find(s=>s.id===d.source.id).url).toBe(d.source.url);
 const story=lesson.revision.assets.find(a=>a.id===d.story.id);expect(d.story.path).toBe(story.path);expect(d.story.content_hash).toBe(story.content_hash);expect(d.story.videos).toEqual(story.videos);
 for(const [id,panel]of Object.entries(d.panels)){
  expect(lesson.revision.read_sections.find(s=>s.id===id).check).toBeNull();
  for(const lang of ['en','fil'])for(const card of panel[lang].cards)expect(lesson.revision.read_sections.find(s=>s.id===card.source_section)['body_'+lang]).toContain(card.text);
 }
 expect(d.panels['roles-and-authority'].en.cards.at(-1).text).toContain('local health board as the accreditation authority');
 expect(d.panels['section-1'].en.cards[1].label).toBe('Health-team support person · fictional');
});
it('retains the released shared reader and all authored lesson/media sources unchanged',()=>{
 const base='0e628f561bfd92339e896d136708cc4fa2d25569',path='src/components/elearning/reference-lessons.tsx';
 expect(fs.readFileSync(path)).toEqual(execFileSync('git',['show',base+':'+path]));
 expect(execFileSync('git',['diff',base,'--','content/training/day1-basic-competencies/modules/04-ra7883/lessons/bhw-legal-role','public/training/bhw-1-4'])).toHaveLength(0);
});

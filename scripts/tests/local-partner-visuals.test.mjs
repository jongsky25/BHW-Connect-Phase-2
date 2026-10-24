// @vitest-environment node
import fs from 'node:fs';
import {beforeFeedbackHepoPresentation} from '../lib/feedback-hepo-preservation.mjs';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {loadReferenceModule,contentHash} from '../lib/reference-content.mjs';

it('binds the six replacements to reviewed assets and their approved bilingual teaching purpose',()=>{
 const d=JSON.parse(fs.readFileSync('src/lib/elearning/local-partner-visuals.json'));
 const lesson=loadReferenceModule('content/training/day1-basic-competencies/modules/05-bhw-at-barangay','public').lessons.find(l=>l.manifest.lesson_key===d.lesson_key);
 expect(contentHash(lesson)).toBe(d.content_hash);expect(Object.keys(d.visuals)).toHaveLength(6);
 for(const [id,visual]of Object.entries(d.visuals)){
  const asset=lesson.revision.assets.find(a=>a.id===id),read=lesson.revision.read_sections.find(s=>s.id===visual.section_id),slide=lesson.revision.slides.find(s=>s.id==='slide-'+visual.section_id);
  expect(visual.path).toBe(asset.path);expect(visual.content_hash).toBe(asset.content_hash);expect(read.asset_ids).toContain(id);expect(slide.asset_ids).toContain(id);
  for(const lang of ['en','fil']){
   const v=visual[lang];expect(v.title).toBe(asset['caption_'+lang]);
   if(visual.kind!=='practice'){expect(v.cards).toEqual(slide['display_'+lang].split('\n'));expect(v.caption).toBe(read['takeaway_'+lang]);}
   else{expect(v.cards).toHaveLength(3);for(const option of read.check.options)expect(JSON.stringify(v)).not.toContain(option[lang]);expect(JSON.stringify(v)).not.toContain(read.check['feedback_'+lang]);}
  }
 }
 const scene=lesson.revision.assets.find(a=>a.id===d.scene.id);expect(d.scene.path).toBe(scene.path);expect(d.scene.content_hash).toBe(scene.content_hash);
});
it('retains the exact predecessor reader and unchanged approved lesson/media sources',()=>{
 const path='src/components/elearning/reference-lessons.tsx';expect(beforeFeedbackHepoPresentation(path)).toEqual(execFileSync('git',['show','f2016a228c9d7b65ce58e9c65cc853c5bd00a4d3:'+path]));
 expect(execFileSync('git',['diff','f2016a228c9d7b65ce58e9c65cc853c5bd00a4d3','--','content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-local-partners','public/training/bhw-1-5'])).toHaveLength(0);
});

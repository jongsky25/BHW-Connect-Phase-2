// @vitest-environment node
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import{expect,it}from'vitest';
import{loadReferenceModule,contentHash}from'../lib/reference-content.mjs';
it('binds the six numbered slides and bounded scenes to approved source',()=>{
 const d=JSON.parse(fs.readFileSync('src/lib/elearning/definition-slide-presentation.json'));
 const lesson=loadReferenceModule('content/training/day1-basic-competencies/modules/07-problema','public').lessons.find(l=>l.manifest.lesson_key===d.lesson_key);
 expect(contentHash(lesson)).toBe(d.content_hash);expect(d.slides).toEqual(lesson.revision.slides.map(s=>s.id));expect(d.assets).toHaveLength(6);
 for(const a of d.assets){const asset=lesson.revision.assets.find(s=>s.id===a.id);expect(a.path).toBe(asset.path);expect(a.content_hash).toBe(asset.content_hash);expect(lesson.revision.slides.some(s=>s.asset_ids.includes(a.id))).toBe(true);}
});
it('retains the entire reader and authored source/media bytes',()=>{
 const base='283e49e29e8d34d570b9c9d0d4549f4d4d509911',p='src/components/elearning/reference-lessons.tsx';expect(fs.readFileSync(p)).toEqual(execFileSync('git',['show',base+':'+p]));
 expect(execFileSync('git',['diff',base,'--','content/training/day1-basic-competencies/modules/07-problema/lessons/problem-define','public/training/bhw-1-7'])).toHaveLength(0);
});

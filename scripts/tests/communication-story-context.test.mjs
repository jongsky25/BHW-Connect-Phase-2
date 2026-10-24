// @vitest-environment node
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {loadReferenceModule,contentHash} from '../lib/reference-content.mjs';
import {COMMUNICATION_EXPLAIN_BEATS} from '../../remotion/src/communication-explain/narration.ts';
import {beforeFeedbackStoryContext} from '../lib/feedback-story-preservation.mjs';

it('binds case excerpts to approved Read and literal transcript paragraphs to the unchanged captions and narration script',()=>{
 const data=JSON.parse(fs.readFileSync('src/lib/elearning/communication-story-context.json'));
 const lesson=loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public').lessons.find(l=>l.manifest.lesson_key===data.lesson_key);
 expect(contentHash(lesson)).toBe(data.content_hash);
 const asset=lesson.revision.assets.find(a=>a.id===data.story_asset_id);
 const sha=b=>createHash('sha256').update(b).digest('hex');
 for(const lang of ['en','fil']){
  for(const person of data.cases){const section=lesson.revision.read_sections.find(s=>s.id===person.section_id);for(const excerpt of person[lang].split(' … '))expect(section['body_'+lang]).toContain(excerpt);}
  const t=data.transcript[lang];
  expect(asset.videos[lang].path).toBe(t.video_path);expect(asset.videos[lang].content_hash).toBe(t.video_hash);
  expect(sha(fs.readFileSync('public'+t.video_path))).toBe(t.video_hash);
  const captions=fs.readFileSync('public'+t.captions_path);
  expect(sha(captions)).toBe(t.captions_hash);
  const paragraphs=captions.toString().trim().split(/\n\s*\n/).slice(1).map(block=>block.split('\n').slice(2).join('\n').trim());
  expect(t.paragraphs).toEqual(paragraphs);
  expect(t.paragraphs).toEqual(COMMUNICATION_EXPLAIN_BEATS.map(beat=>beat[lang]));
 }
});
it('reconstructs the complete preceding shared reader for historical checks',()=>{
 const r=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-4.1c-reader-preservation.json'));
 expect(beforeFeedbackStoryContext(r.path)).toEqual(execFileSync('git',['show',r.base_commit+':'+r.path]));
});

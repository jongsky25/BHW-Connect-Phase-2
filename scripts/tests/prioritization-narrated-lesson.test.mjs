// @vitest-environment node
import fs from 'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';import{expect,it}from'vitest';
import{loadReferenceModule,contentHash}from'../lib/reference-content.mjs';
import{buildNarrationZones}from'../lib/narration-zones.mjs';
import{beforeFeedbackNarratedLesson}from'../lib/feedback-narrated-lesson-preservation.mjs';
const data=JSON.parse(fs.readFileSync('src/lib/elearning/prioritization-narrated-lesson.json'));
const narration=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/narration.json'));
const approved=JSON.parse(fs.readFileSync('docs/lesson-173-narration-approval.json'));
const source=loadReferenceModule('content/training/day1-basic-competencies/modules/07-problema','public').lessons.find(l=>l.manifest.lesson_key===data.lesson_key);
const sha=b=>createHash('sha256').update(b).digest('hex');
it('uses five approved scenes and recordings, with no final check or new teaching words',()=>{
 expect(contentHash(source)).toBe(data.content_hash);expect(data.sections).toEqual(['criteria','worked-scores','score-evidence','tie-and-urgent-care','practice']);
 for(const [lang,render]of Object.entries(data.languages)){
  expect(render.clips.map(c=>c.section_id)).toEqual(data.sections);
  let offset=0;
  for(const clip of render.clips){
   const s=source.revision.read_sections.find(s=>s.id===clip.section_id),a=source.revision.assets.find(a=>a.id===clip.asset_id),track=narration.lessons[data.lesson_key].sections[clip.section_id][lang];
   expect(s.check).toBeNull();expect(a.review_status).toBe('approved');expect(clip.image_path).toBe(a.path);expect(sha(fs.readFileSync('public'+clip.image_path))).toBe(clip.image_sha256);
   expect(clip.src).toBe(track.src);expect(clip.sha256).toBe(track.sha256);expect(sha(fs.readFileSync('public'+clip.src))).toBe(clip.sha256);expect(approved.tracks['public'+clip.src].sha256).toBe(clip.sha256);
   expect(track.timings.map(t=>({zone:t.zone,index:t.index,text:t.text}))).toEqual(buildNarrationZones({heading:s['heading_'+lang],body:s['body_'+lang],takeaway:s['takeaway_'+lang]}));
   expect(clip.start_seconds).toBeCloseTo(offset,6);offset+=clip.duration_seconds;
  }
  expect(Math.abs(render.video.duration_s-offset)).toBeLessThan(.1);
  for(const media of [render.video,render.video.captions])expect(sha(fs.readFileSync('public'+media.path))).toBe(media.content_hash);
  const vtt=fs.readFileSync('public'+render.video.captions.path,'utf8');
  expect(vtt.startsWith('WEBVTT\n')).toBe(true);expect((vtt.match(/ --> /g)??[])).toHaveLength(render.clips.reduce((n,c)=>n+narration.lessons[data.lesson_key].sections[c.section_id][lang].timings.length,0));
  const protectedSection=source.revision.read_sections.find(s=>s.id==='check');expect(vtt).not.toContain(protectedSection['takeaway_'+lang]);
 }
});
it('reconstructs all previous reader bytes, retains every old source/media byte and adds only four pinned media files',()=>{
 const r=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-4.2b-reader-preservation.json'));expect(r.replacements).toHaveLength(8);
 expect(beforeFeedbackNarratedLesson(r.path)).toEqual(execFileSync('git',['show',r.base_commit+':'+r.path]));
 expect(execFileSync('git',['diff',r.base_commit,'--','content/training/','remotion/','docs/lesson-*',':(exclude)content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-stock-count-v5/**'])).toHaveLength(0);
 expect(execFileSync('git',['diff','--diff-filter=MDR',r.base_commit,'--','public/training/'])).toHaveLength(0);
});
it('retains all twelve Legal-basis recordings with exact current words and check gating',()=>{
 const l=loadReferenceModule('content/training/day1-basic-competencies/modules/04-ra7883','public').lessons.find(l=>l.manifest.lesson_key==='bhw-legal-role');
 expect(contentHash(l)).toBe('7a4880da236ea31a78647bb447ba6ff66eb7be701eb442059c3fabf77eddc57e');
 for(const s of l.revision.read_sections)for(const lang of ['en','fil']){
  const track=narration.lessons[l.manifest.lesson_key].sections[s.id][lang];expect(sha(fs.readFileSync('public'+track.src))).toBe(track.sha256);
  expect(track.timings.map(t=>({zone:t.zone,index:t.index,text:t.text}))).toEqual(buildNarrationZones({heading:s['heading_'+lang],body:s['body_'+lang],takeaway:s['takeaway_'+lang]}));
 }
});

// @vitest-environment node
import fs from'node:fs';import{execFileSync}from'node:child_process';import{expect,it}from'vitest';
import{beforeFeedbackLanguageAvailability}from'../lib/feedback-language-preservation.mjs';
import{buildNarrationZones}from'../lib/narration-zones.mjs';import{createHash}from'node:crypto';
const root='content/training/day1-basic-competencies/modules';
const sha=p=>createHash('sha256').update(fs.readFileSync('public'+p)).digest('hex');
it('retains every authored translation, teaching, assessment item, recording and media byte',()=>{
 const r=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-4.3-reader-preservation.json'));
 expect(r.base_commit).toBe('629daa83acd4687dee1139dbeba3f81edfb7a6fa');expect(r.replacements).toHaveLength(5);
 expect(beforeFeedbackLanguageAvailability(r.path)).toEqual(execFileSync('git',['show',r.base_commit+':'+r.path]));
 // The new immutable v5 artifact has its own exact-copy and continuity test.
 expect(execFileSync('git',['diff',r.base_commit,'--','content/','public/training/','remotion/','docs/lesson-*',':(exclude)content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-stock-count-v5/**',':(exclude)content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-resource-monitor-v6/**',':(exclude)content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-communication-clarify-v7/**',':(exclude)content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-needlestick-context-v8/**',':(exclude)content/training/day1-basic-competencies/lesson-releases/safety-identify-fb-2.3o-v2/**',':(exclude)content/training/day1-basic-competencies/lesson-releases/bhw-roles-application-fb-2.2i-v2/**'])).toHaveLength(0);
});
it('all twenty approved packages retain matching recordings and exact video/caption bytes',()=>{
 const paths=fs.readdirSync(root,{recursive:true}).filter(p=>/pilot\.(ceb|hil)\.json$/.test(p));expect(paths).toHaveLength(20);let tracks=0,videos=0;
 for(const p of paths){const t=JSON.parse(fs.readFileSync(root+'/'+p));expect(t.review_status).toBe('approved');
  for(const s of t.read_sections){const n=t.narration[s.id];expect(sha(n.src)).toBe(n.sha256);expect(n.timings.map(z=>({zone:z.zone,index:z.index,text:z.text}))).toEqual(buildNarrationZones(s));tracks++;}
  expect(sha(t.video.path)).toBe(t.video.content_hash);expect(sha(t.video.captions.path)).toBe(t.video.captions.content_hash);expect(fs.existsSync('public'+(t.video.poster?.path??t.poster))).toBe(true);videos++;
 }
 expect(tracks).toBe(116);expect(videos).toBe(20);
});

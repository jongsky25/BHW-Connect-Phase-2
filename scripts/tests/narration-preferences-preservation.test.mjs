import {beforeFeedbackNarratedLesson} from '../lib/feedback-narrated-lesson-preservation.mjs';
// @vitest-environment node
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {beforeFeedbackNarrationPreferences} from '../lib/feedback-narration-preservation.mjs';

it('pins only three listening-scope additions and reconstructs the full released reader',()=>{
 const r=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-4.2a-reader-preservation.json'));
 expect(r.base_commit).toBe('23198eaf91097c76ecf5d7e76a33e5d773e639d7');
 expect(r.replacements).toHaveLength(3);
 expect(createHash('sha256').update(beforeFeedbackNarratedLesson(r.path)).digest('hex')).toBe(r.successor_sha256);
 expect(beforeFeedbackNarrationPreferences(r.path)).toEqual(execFileSync('git',['show',r.base_commit+':'+r.path]));
 const reader=fs.readFileSync(r.path,'utf8');
 expect(reader).toContain('!videoSelected && mode === "read" && lesson');
 expect(reader).toContain('continuationScope={narrationScope}');
 expect(reader).toContain('narration={revealSummary ? lessonNarration?.[item.id] : undefined}');
 expect(reader.match(/continuationScope=/g)).toHaveLength(1);
});
it('retains every authored lesson, recording, timing, translation and media byte',()=>{
 const media=JSON.parse(fs.readFileSync('src/lib/elearning/prioritization-narrated-lesson.json'));
 const additions=Object.values(media.languages).flatMap(x=>[x.video.path,x.video.captions.path]);
 // FB-4.2b adds four hash-bound derived files; every preceding byte is retained.
 expect(execFileSync('git',['diff','23198eaf91097c76ecf5d7e76a33e5d773e639d7','--','content/training/','public/training/','remotion/','docs/lesson-*',':(exclude)content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-stock-count-v5/**',':(exclude)content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-resource-monitor-v6/**',':(exclude)content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-communication-clarify-v7/**',':(exclude)content/training/day1-basic-competencies/lesson-releases/safety-identify-fb-2.3o-v2/**',...additions.map(p=>':(exclude)public'+p)],{maxBuffer:8*1024*1024})).toHaveLength(0);
});

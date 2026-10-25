// @vitest-environment node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {beforeFeedbackSectionOutline} from '../lib/feedback-section-outline-preservation.mjs';
it('reconstructs the complete preceding reader and preserves approved teaching/media/assessments',()=>{
 const r=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-5.2c-reader-preservation.json'));
 expect(r.base_commit).toBe('92abe86bf9db3bb3369e35700dc5e923d49280b4');expect(r.replacements).toHaveLength(3);
 expect(createHash('sha256').update(fs.readFileSync(r.path)).digest('hex')).toBe(r.successor_sha256);
 expect(beforeFeedbackSectionOutline(r.path)).toEqual(execFileSync('git',['show',r.base_commit+':'+r.path]));
 expect(execFileSync('git',['diff',r.base_commit,'--','content/','public/training/','remotion/','docs/lesson-*'])).toHaveLength(0);
});

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
 expect(execFileSync('git',['diff',r.base_commit,'--','content/','public/training/','remotion/','docs/lesson-*',':(exclude)content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-stock-count-v5/**',':(exclude)content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-resource-monitor-v6/**',':(exclude)content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-communication-clarify-v7/**',':(exclude)content/training/day1-basic-competencies/lesson-releases/safety-identify-fb-2.3o-v2/**',':(exclude)content/training/day1-basic-competencies/lesson-releases/bhw-roles-application-fb-2.2i-v2/**'])).toHaveLength(0);
});
it('memoizes only exact bytes and protects the cached predecessor from caller mutation',()=>{
 const r=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-5.2c-reader-preservation.json'));
 const expected=execFileSync('git',['show',r.base_commit+':'+r.path]);
 const first=beforeFeedbackSectionOutline(r.path);first[0]^=1;
 expect(beforeFeedbackSectionOutline(r.path)).toEqual(expected);
 const changed=Buffer.from(fs.readFileSync(r.path));changed[0]^=1;
 expect(beforeFeedbackSectionOutline(r.path,changed)).toBe(changed);
 expect(beforeFeedbackSectionOutline(r.path)).toEqual(expected);
});
it('still rejects a changed file on disk after the exact source has been cached',()=>{
 const directory=fs.mkdtempSync('/tmp/lesson-outline-guard-');
 const r=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-5.2c-reader-preservation.json'));
 const source=fs.readFileSync(r.path),helper=new URL('../lib/feedback-section-outline-preservation.mjs',import.meta.url).href;
 try{
  fs.mkdirSync(directory+'/src/components/elearning',{recursive:true});
  fs.mkdirSync(directory+'/docs/feedback-remediation',{recursive:true});
  fs.writeFileSync(directory+'/'+r.path,source);
  fs.writeFileSync(directory+'/docs/feedback-remediation/fb-5.2c-reader-preservation.json',JSON.stringify(r));
  const script=`import fs from 'node:fs';import {beforeFeedbackSectionOutline as before} from ${JSON.stringify(helper)};
   const path=${JSON.stringify(r.path)},original=fs.readFileSync(path);before(path);const changed=Buffer.from(original);changed[0]^=1;fs.writeFileSync(path,changed);
   let rejected=false;try{before(path);}catch(e){rejected=e.message.includes('Unpinned integrated successor');}
   if(!rejected)throw Error('Cached guard accepted changed disk bytes');fs.writeFileSync(path,original);before(path);console.log('disk mutation rejected');`;
  expect(execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:directory,encoding:'utf8'})).toContain('disk mutation rejected');
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

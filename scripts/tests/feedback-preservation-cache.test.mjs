// @vitest-environment node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {beforeFeedbackLanguageAvailability} from '../lib/feedback-language-preservation.mjs';
import {beforeFeedbackNarratedLesson} from '../lib/feedback-narrated-lesson-preservation.mjs';
import {lesson164View} from '../lib/lesson-164-integration.mjs';
const cases=[
 ['language',beforeFeedbackLanguageAvailability,'fb-4.3-reader-preservation.json'],
 ['narrated lesson',beforeFeedbackNarratedLesson,'fb-4.2b-reader-preservation.json'],
];
it.each(cases)('keeps the exact %s predecessor and rejects unpinned caller bytes after caching',(_name,before,file)=>{
 const r=JSON.parse(fs.readFileSync('docs/feedback-remediation/'+file));
 const expected=execFileSync('git',['show',r.base_commit+':'+r.path]);
 const first=before(r.path);expect(first).toEqual(expected);first[0]^=1;
 expect(before(r.path)).toEqual(expected);
 const changed=Buffer.from(fs.readFileSync(r.path));changed[0]^=1;
 expect(before(r.path,changed)).toBe(changed);
 expect(()=>lesson164View(r.path,'approvedMain',changed)).toThrow('Unpinned');
 expect(before(r.path)).toEqual(expected);
});
it('rechecks disk after both caches warm, rejects mutation and accepts restored exact bytes',()=>{
 const directory=fs.mkdtempSync('/tmp/feedback-cache-guard-');
 const path='src/components/elearning/reference-lessons.tsx';
 const language=new URL('../lib/feedback-language-preservation.mjs',import.meta.url).href;
 const narrated=new URL('../lib/feedback-narrated-lesson-preservation.mjs',import.meta.url).href;
 try{
  fs.mkdirSync(directory+'/src/components/elearning',{recursive:true});
  fs.mkdirSync(directory+'/docs/feedback-remediation',{recursive:true});
  fs.copyFileSync(path,directory+'/'+path);
  for(const file of ['fb-5.2c-reader-preservation.json','fb-4.3-reader-preservation.json','fb-4.2b-reader-preservation.json'])
   fs.copyFileSync('docs/feedback-remediation/'+file,directory+'/docs/feedback-remediation/'+file);
  const script=`import fs from 'node:fs';import assert from 'node:assert/strict';
   import {beforeFeedbackLanguageAvailability as language} from ${JSON.stringify(language)};
   import {beforeFeedbackNarratedLesson as narrated} from ${JSON.stringify(narrated)};
   const path=${JSON.stringify(path)},original=fs.readFileSync(path),guards=[language,narrated];
   const expected=guards.map(before=>before(path));
   const changed=Buffer.from(original);changed[0]^=1;fs.writeFileSync(path,changed);
   for(const before of guards)assert.throws(()=>before(path),/Unpinned integrated successor/);
   fs.writeFileSync(path,original);guards.forEach((before,i)=>assert.deepEqual(before(path),expected[i]));
   console.log('Both cached guards rejected changed disk bytes');`;
  expect(execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:directory,encoding:'utf8'})).toContain('Both cached guards rejected changed disk bytes');
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

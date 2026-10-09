// Identify the exact pre-existing 1.7.3 failure without skipping or changing its guard.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {narratedModules,NARRATION_MANIFEST} from './lib/narration-sources.mjs';
import {loadReferenceModule} from './lib/reference-content.mjs';import {planReferenceNarration} from './lib/reference-narration.mjs';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
export function inheritedNarrationFailure(){
 const b=j('docs/lesson-181-execution-baseline.json'),m=j(NARRATION_MANIFEST),prefix='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-prioritize/';
 assert.deepEqual(m.lessons['problem-prioritize'],b.narration.lessons['problem-prioritize']);assert.deepEqual(m.history?.['problem-prioritize'],b.narration.history?.['problem-prioritize']);
 const files=Object.entries(b.protected_sha256).filter(([p])=>p.startsWith(prefix)||p==='docs/lesson-173-owner-approval.json'||p==='docs/lesson-173-verification.json').map(([p,hash])=>{assert.equal(sha(fs.readFileSync(p)),hash,p);return {file:p,sha256:hash};});assert(files.length>=7);for(const p of ['docs/lesson-173-owner-approval.json','docs/lesson-173-verification.json']){const hash=sha(execFileSync('git',['show',b.source_commit+':'+p],{maxBuffer:20*1024*1024}));assert.equal(sha(fs.readFileSync(p)),hash,p);if(!files.some(f=>f.file===p))files.push({file:p,sha256:hash});}
 const modules=narratedModules('.').map(({key,dir})=>({key,lessons:loadReferenceModule(dir,'public').lessons}));
 const stale=planReferenceNarration(modules,m,p=>fs.existsSync('public'+p)?sha(fs.readFileSync('public'+p)):null).filter(p=>p.action!=='skip').map(p=>p.lessonKey+'/'+p.sectionId+'/'+p.language).sort();
 const expected=['criteria','worked-scores','score-evidence','tie-and-urgent-care','practice','check'].flatMap(s=>['fil','en'].map(l=>'problem-prioritize/'+s+'/'+l)).sort();assert.deepEqual(stale,expected,'Only the exact inherited 12 unfinished 1.7.3 tracks may fail');
 const old=j('docs/lesson-173-verification.json'),approval=j('docs/lesson-173-owner-approval.json');assert.equal(old.unit_tests.failed,1);assert(approval.known_outstanding_work.includes('12 matching narration MP3s'));
 return {status:'inherited failure; full CI remains blocked',baseline_commit:b.source_commit,unchanged_stale_tracks:stale,protected_files:files,prior_release_evidence:'docs/lesson-173-owner-approval.json',prior_verification:'docs/lesson-173-verification.json',scope:'No 1.7.3 text, selected narration, history, media or test was changed. The full normal guard remains enabled.'};
}

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {loadLessonMap} from './lib/chapter1-assessment-content.mjs';
import {buildApprovedNeedlestickContextRelease,publishNeedlestickContextSql} from './lib/feedback-needlestick-context-publication.mjs';
import {releaseHash} from './lib/feedback-uhc-proposal.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const dir=join(root,'content/training/day1-basic-competencies/learner-assessment-v2');
const target='releases/chapter1-feedback-needlestick-context-v8';
const read=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const base=read('content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-communication-clarify-v7/release.json');
const proposal=read('docs/feedback-remediation/proposals/fb-2.2k-needlestick-context.json');
const approval=read(`content/training/day1-basic-competencies/learner-assessment-v2/${target}/approval-record.json`);
const reviewed=readFileSync(join(root,approval.review_record),'utf8');
for(const language of ['en','fil'])assert(reviewed.includes(proposal.stem[language]),'Approved review copy drift');
const release=buildApprovedNeedlestickContextRelease(base,proposal,approval,
  {...loadLessonMap(root),orientation:JSON.parse(readFileSync(join(dir,'orientation.json'),'utf8'))});
assert.deepEqual(release,read(`content/training/day1-basic-competencies/learner-assessment-v2/${target}/release.json`),'Approved release snapshot drift');
assert(process.argv.slice(2).every(arg=>arg==='--sql'),'Only --sql is supported; no database connection is made');
process.stdout.write(process.argv.includes('--sql')?publishNeedlestickContextSql(base,release):
  `Approved ${release.release_id}; SHA-256 ${releaseHash(release)}\n`+
  'One new pretest T27 stem, 59 other form items, 48 checkpoint items and 40 other curriculum pins unchanged.\n'+
  'Two approved live lesson pins updated; existing assessment history stays pinned and comparability remains unvalidated.\n');

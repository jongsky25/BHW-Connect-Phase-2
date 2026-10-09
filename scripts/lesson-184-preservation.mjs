// Verify target-only successors plus every protected original media/source byte.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {beforeLesson184} from './lib/lesson-184-integration.mjs';
const prior='7a39a4b1b4a2caa461f9aa14514bd66a747ab8c8',leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-demonstrate/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync('docs/lesson-184-proposal-receipt.json'));
for(const[p,e]of Object.entries(receipt.changed_existing_files)){if(sha(fs.readFileSync(p))!==e.proposed_sha256||sha(beforeLesson184(p))!==e.predecessor_sha256)throw Error('Unpinned successor/predecessor '+p);}
const old=JSON.parse(beforeLesson184('content/training/day1-basic-competencies/narration.json')),current=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/narration.json'));
for(const[k,v]of Object.entries(old.lessons))if(k!=='safety-demonstrate'&&JSON.stringify(v)!==JSON.stringify(current.lessons[k]))throw Error('Sibling narration changed '+k);
for(const[k,v]of Object.entries(old.history??{}))if(k!=='safety-demonstrate'&&JSON.stringify(v)!==JSON.stringify(current.history[k]))throw Error('Sibling history changed '+k);
const protectedFiles=execFileSync('git',['ls-tree','-r','--name-only',prior],{encoding:'utf8',maxBuffer:32*1024*1024}).trim().split('\n').filter(p=>p.startsWith('public/training/')||p.startsWith('content/training/')||p.startsWith('src/')||p.startsWith('remotion/')||p.startsWith('docs/source-material/')||/approval|proposal-receipt/.test(p));
let unchanged=0;
// Git's exact tree comparison bounds the proof to all predecessor files, not a loose glob.
const changed=execFileSync('git',['diff',prior,'--name-only','--',...['public/training','content/training','src','remotion','docs']],{encoding:'utf8',maxBuffer:32*1024*1024}).trim().split('\n');
for(const p of protectedFiles){if(!fs.existsSync(p))throw Error('Protected file missing '+p);if(!changed.includes(p)){unchanged++;continue;}if(receipt.changed_existing_files[p])continue;const b=execFileSync('git',['show',prior+':'+p],{maxBuffer:32*1024*1024});if(sha(b)!==sha(fs.readFileSync(p)))throw Error('Non-target protected byte changed '+p);unchanged++;}
const lesson=JSON.parse(fs.readFileSync(leaf+'lesson.json'));
for(const a of lesson.assets){if(sha(fs.readFileSync(path.join('public',a.path)))!==a.content_hash)throw Error('Asset hash mismatch '+a.id);for(const v of Object.values(a.videos??{}))for(const m of [v,v.poster,v.captions].filter(Boolean))if(sha(fs.readFileSync(path.join('public',m.path)))!==m.content_hash)throw Error('Video hash mismatch '+a.id);}
const result={status:'passed',source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),predecessor_commit:prior,protected_predecessor_files:protectedFiles.length,unchanged_files:unchanged,scoped_existing_successors:Object.keys(receipt.changed_existing_files),non_target_narration_and_history:'exactly preserved',old_public_media:'all predecessor bytes retained',lesson_manifest:'unchanged from pinned baseline',owner_release_approval:false};
fs.writeFileSync('docs/lesson-184-preservation.json',JSON.stringify(result,null,2)+'\n');console.log('Protected '+protectedFiles.length+' predecessor files; only exact receipt-scoped successors differ.');

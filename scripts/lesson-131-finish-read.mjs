// Preserve UTF-8 authored wording and audited order-number pronunciation.
// Complete authorized Mimi rename tracks without regenerating completed story media.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule} from './lib/reference-content.mjs';
import {planReferenceNarration} from './lib/reference-narration.mjs';
const root=path.resolve(import.meta.dirname,'..');
const allowed=['bhs-promotions','bhs-decline','bhs-resources'];
const manifestPath=path.join(root,'content/training/day1-basic-competencies/narration.json');
const original=JSON.parse(readFileSync(manifestPath));
try {execFileSync(process.execPath,['scripts/training-narrate.mjs','--modules','03-polisiya-bhs','--lessons',allowed.join(','),'--provider','gemini','--max-requests','100','--apply'],{cwd:root,stdio:'inherit'});}
finally {const deleted=execFileSync('git',['ls-files','--deleted','-z','--','public/training/audio'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);if(deleted.length)execFileSync('git',['restore','--',...deleted],{cwd:root});}
const current=JSON.parse(readFileSync(manifestPath));
for(const key of Object.keys(original.lessons))if(!allowed.includes(key)&&JSON.stringify(original.lessons[key])!==JSON.stringify(current.lessons[key]))throw Error('Unrelated narration changed: '+key);
const moduleKey='03-polisiya-bhs';
const {lessons}=loadReferenceModule(path.join(root,'content/training/day1-basic-competencies/modules',moduleKey),path.join(root,'public'));
const plan=planReferenceNarration([{key:moduleKey,lessons}],current,src=>{const p=path.join(root,'public',src.slice(1));return existsSync(p)?createHash('sha256').update(readFileSync(p)).digest('hex'):null;});
const pending=plan.filter(i=>allowed.includes(i.lessonKey)&&i.action!=='skip').map(i=>`${i.lessonKey}/${i.sectionId}/${i.language}`);
writeFileSync(path.join(root,'docs/lesson-131-read-completion.json'),JSON.stringify({source_commit:process.env.GITHUB_SHA,date:new Date().toISOString(),pending_read_tracks:pending,current_allowed_tracks:plan.filter(i=>allowed.includes(i.lessonKey)&&i.action==='skip').length,story_media:'Preserved completed files; no synthesis or render invoked'},null,2)+'\n');
if(pending.length)throw Error('Read tracks remain pending');

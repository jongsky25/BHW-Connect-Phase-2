// Target-only Gemini Kore Read narration; preserve all prior tracks and bytes.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadReferenceModule} from './lib/reference-content.mjs';
import {planReferenceNarration} from './lib/reference-narration.mjs';
const key='resources-monitor',moduleKey='09-sustainable-practices';
const file='content/training/day1-basic-competencies/narration.json';
if(!process.env.GEMINI_API_KEY)throw Error('Repository Gemini credential unavailable; no narration fabricated.');
const before=JSON.parse(fs.readFileSync(file)),manifest=structuredClone(before);
manifest.history??={};manifest.history[key]??=[];
if(!manifest.history[key].some(h=>JSON.stringify(h)===JSON.stringify(before.lessons[key])))manifest.history[key].push(structuredClone(before.lessons[key]));
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
let error=null;
try{execFileSync(process.execPath,['scripts/training-narrate.mjs','--modules',moduleKey,'--lessons',key,'--provider','gemini','--max-requests','160','--apply'],{stdio:'inherit'});}catch(e){error=e.message;}
finally{
 const deleted=execFileSync('git',['ls-files','--deleted','-z','--','public/training/audio'],{encoding:'utf8'}).split('\0').filter(Boolean);
 if(deleted.length)execFileSync('git',['restore','--',...deleted]);
}
const current=JSON.parse(fs.readFileSync(file));
for(const[k,v]of Object.entries(before.lessons))if(k!==key&&JSON.stringify(v)!==JSON.stringify(current.lessons[k]))throw Error('Sibling narration changed '+k);
for(const[k,v]of Object.entries(before.history??{}))if(k!==key&&JSON.stringify(v)!==JSON.stringify(current.history[k]))throw Error('Sibling history changed '+k);
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/'+moduleKey,'public');
const plan=planReferenceNarration([{key:moduleKey,lessons}],current,src=>fs.existsSync('public'+src)?sha('public'+src):null).filter(p=>p.lessonKey===key);
const pending=plan.filter(p=>p.action!=='skip').map(p=>`${p.sectionId}/${p.language}`);
fs.writeFileSync('docs/lesson-193-media-generation.json',JSON.stringify({date:new Date().toISOString(),source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),provider:'gemini:gemini-3.8-flash-tts:Kore',request_budget:160,expected_read_tracks:14,completed_read_tracks:14-pending.length,pending,error,story_status:'blocked: 1.9.1 shared Charlaine reference and seven final scenes unavailable',human_listening:'pending',facility_review:'pending',owner_approval:'pending'},null,2)+'\n');
if(pending.length)process.exitCode=1;

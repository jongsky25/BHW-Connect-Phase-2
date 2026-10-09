// Resume actual target-only Gemini narration using the existing repository secret.
// Preserve all historical selections/files; no database or publication operations.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const manifestPath='content/training/day1-basic-competencies/narration.json';
if(!process.env.GEMINI_API_KEY)throw Error('GEMINI_API_KEY unavailable; no media generated or selections changed.');
const old=JSON.parse(fs.readFileSync(manifestPath));
const original=structuredClone(old);
old.history??={};old.history['problem-action-plan']??=[];
if(!old.history['problem-action-plan'].some(entry=>JSON.stringify(entry)===JSON.stringify(old.lessons['problem-action-plan'])))old.history['problem-action-plan'].push(old.lessons['problem-action-plan']);
fs.writeFileSync(manifestPath,JSON.stringify(old,null,2)+'\n');
try{
 execFileSync(process.execPath,['scripts/training-narrate.mjs','--modules','07-problema','--lessons','problem-action-plan','--provider','gemini','--max-requests','500','--apply'],{stdio:'inherit'});
}finally{
 const deleted=execFileSync('git',['ls-files','--deleted','-z','--','public/training/audio'],{encoding:'utf8'}).split('\0').filter(Boolean);
 if(deleted.length)execFileSync('git',['restore','--',...deleted]);
 const current=JSON.parse(fs.readFileSync(manifestPath));
 for(const [key,value]of Object.entries(original.lessons))if(key!=='problem-action-plan')assert.deepEqual(current.lessons[key],value,'Sibling selection changed: '+key);
 for(const [key,value]of Object.entries(original.history??{}))if(key!=='problem-action-plan')assert.deepEqual(current.history[key],value,'Sibling history changed: '+key);
}

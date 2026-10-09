// Target-only Gemini Kore Read/Slides generation, preserving every historical track.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {loadReferenceModule} from './lib/reference-content.mjs';import {planReferenceNarration} from './lib/reference-narration.mjs';
const file='content/training/day1-basic-competencies/narration.json',original=JSON.parse(fs.readFileSync(file));
if(!process.env.GEMINI_API_KEY)throw Error('Existing repository GEMINI_API_KEY required; no alternate voice is substituted');
const before=JSON.parse(JSON.stringify(original));original.history??={};original.history['safety-controls']??=[];
if(!original.history['safety-controls'].some(h=>JSON.stringify(h)===JSON.stringify(original.lessons['safety-controls'])))original.history['safety-controls'].push(original.lessons['safety-controls']);
fs.writeFileSync(file,JSON.stringify(original,null,2)+'\n');
let failure=null,restored=[];try{execFileSync(process.execPath,['scripts/training-narrate.mjs','--modules','08-osh','--lessons','safety-controls','--provider','gemini','--max-requests','300','--apply'],{stdio:'inherit'});}catch(e){failure=e.message.split('\n')[0];}finally{
 restored=execFileSync('git',['ls-files','--deleted','-z','--','public/training/audio'],{encoding:'utf8'}).split('\0').filter(Boolean);if(restored.length)execFileSync('git',['restore','--',...restored]);
}
const current=JSON.parse(fs.readFileSync(file));for(const key of Object.keys(before.lessons))if(key!=='safety-controls'&&JSON.stringify(current.lessons[key])!==JSON.stringify(before.lessons[key]))throw Error('Sibling narration changed: '+key);
for(const key of Object.keys(before.history??{}))if(key!=='safety-controls'&&JSON.stringify(current.history[key])!==JSON.stringify(before.history[key]))throw Error('Sibling history changed: '+key);
const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/08-osh','public');const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const plan=planReferenceNarration([{key:'08-osh',lessons}],current,src=>fs.existsSync('public'+src)?sha('public'+src):null).filter(i=>i.lessonKey==='safety-controls');
const pending=plan.filter(i=>i.action!=='skip').map(i=>`${i.sectionId}/${i.language}`);const durations=Object.fromEntries(['fil','en'].map(l=>[l,plan.filter(i=>i.language===l&&i.action==='skip').reduce((s,i)=>s+i.existing.duration_seconds,0)]));
fs.writeFileSync('docs/lesson-182-media-generation.json',JSON.stringify({source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),generated_at:new Date().toISOString(),status:pending.length?'incomplete':'Read complete; scene/story blocked on coordinated Apple reference',provider:'gemini:gemini-3.8-flash-tts:Kore',target_read_tracks:12,pending_read_tracks:pending,duration_seconds:durations,historical_audio_restored:restored,generation_error:failure,story_status:'blocked: coordinated Apple reference absent; no story or final art generated',owner_approval:false,human_listening:'pending',clinical_review:'pending'},null,2)+'\n');
if(pending.length)process.exitCode=1;

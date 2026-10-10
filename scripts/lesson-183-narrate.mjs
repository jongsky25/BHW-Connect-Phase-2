// Target-only draft generation. Preserve old selections and every historical file.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadReferenceModule} from './lib/reference-content.mjs';
import {planReferenceNarration} from './lib/reference-narration.mjs';
const root=path.resolve(import.meta.dirname,'..');
const manifestPath=root+'/content/training/day1-basic-competencies/narration.json';
const original=JSON.parse(fs.readFileSync(manifestPath));
const sha=b=>createHash('sha256').update(b).digest('hex');
const save=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const files=execFileSync('git',['ls-files','-z','--','public/training/audio'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const protectedMedia=Object.fromEntries(files.map(p=>[p,sha(fs.readFileSync(root+'/'+p))]));
const starting=loadReferenceModule(root+'/content/training/day1-basic-competencies/modules/08-osh',root+'/public');
const fileHash=src=>fs.existsSync(root+'/public'+src)?sha(fs.readFileSync(root+'/public'+src)):null;
const pending=planReferenceNarration([{key:'08-osh',lessons:starting.lessons}],original,fileHash).some(i=>i.lessonKey==='safety-prepare'&&i.action!=='skip');
const history=structuredClone(original.history??{});
if(pending&&original.lessons['safety-prepare']){
 history['safety-prepare']??=[];
 if(!history['safety-prepare'].some(x=>JSON.stringify(x)===JSON.stringify(original.lessons['safety-prepare'])))history['safety-prepare'].push(original.lessons['safety-prepare']);
}
let error=null;
try{
 if(!process.env.GEMINI_API_KEY)throw Error('Repository GEMINI_API_KEY unavailable; no replacement audio fabricated.');
 execFileSync(process.execPath,['scripts/training-narrate.mjs','--modules','08-osh','--lessons','safety-prepare','--provider','gemini','--max-requests','350','--concurrency','2','--apply'],{cwd:root,stdio:'inherit'});
}catch(e){error=e.message.split('\n')[0];}
finally{
 const deleted=files.filter(p=>!fs.existsSync(root+'/'+p));
 if(deleted.length)execFileSync('git',['restore','--',...deleted],{cwd:root});
 const result=JSON.parse(fs.readFileSync(manifestPath));
 const preserved={...original,lessons:{...original.lessons,'safety-prepare':result.lessons['safety-prepare']},history};
 save(manifestPath,preserved);
 for(const [p,h]of Object.entries(protectedMedia))assert.equal(sha(fs.readFileSync(root+'/'+p)),h,p);
}
const final=JSON.parse(fs.readFileSync(manifestPath));
const plan=planReferenceNarration([{key:'08-osh',lessons:starting.lessons}],final,fileHash).filter(i=>i.lessonKey==='safety-prepare');
const remaining=plan.filter(i=>i.action!=='skip').map(i=>`${i.sectionId}/${i.language}`);
save(root+'/docs/lesson-183-media-generation.json',{generated_at:new Date().toISOString(),source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),provider:'gemini:gemini-3.8-flash-tts:Kore',status:remaining.length?'incomplete':'read_audio_generated',remaining,error,read_tracks:plan.filter(i=>i.action==='skip').map(i=>({section:i.sectionId,language:i.language,...i.existing})),story:'blocked pending shared pinned Apple reference and scenes',human_listening:'pending',owner_approval:'pending',clinical_review:'pending'});
if(remaining.length)throw Error('Incomplete target narration: '+remaining.join(', '));

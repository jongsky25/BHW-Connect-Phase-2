#!/usr/bin/env node
// Review actual generated educational audio; model-mediated, not human listening.
// API shape: https://ai.google.dev/gemini-api/docs/audio (checked 2026-10-04).
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule} from './lib/reference-content.mjs';
import {planReferenceNarration} from './lib/reference-narration.mjs';
const root=path.resolve(import.meta.dirname,'..');
const model='gemini-3.8-flash';
if(!process.env.GEMINI_API_KEY)throw new Error('Existing repository Gemini secret unavailable for audio review');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const key='04-ra7883';
const {lessons}=loadReferenceModule(path.join(root,'content/training/day1-basic-competencies/modules',key),path.join(root,'public'));
const manifest=JSON.parse(readFileSync(path.join(root,'content/training/day1-basic-competencies/narration.json'),'utf8'));
const plan=planReferenceNarration([{key,lessons}],manifest,src=>{const p=path.join(root,'public',src.slice(1));return existsSync(p)?sha(p):null;});
const records=plan.filter(i=>i.lessonKey==='bhw-legal-role'&&i.action==='skip').map(i=>({id:`read-${i.lessonKey}-${i.sectionId}-${i.language}`,language:i.language,file:path.join(root,'public',i.src.slice(1)),expected:i.zones.map(z=>z.text).join(' ')}));
for(const language of ['fil','en']){
 const folder=path.join(root,'remotion/public/bhw-legal-role');
 if(existsSync(path.join(folder,`narration-${language}.mp3`))&&existsSync(path.join(folder,`narration-${language}.json`))){
  const timing=JSON.parse(readFileSync(path.join(folder,`narration-${language}.json`),'utf8'));
  records.push({id:`story-${language}`,language,file:path.join(folder,`narration-${language}.mp3`),expected:timing.beats.map(b=>b.text).join(' ')});
 }
}
const report={date:new Date().toISOString(),method:'Gemini model-mediated review of actual MP3 bytes; not human listening, owner approval or policy SME review',model,source_commit:process.env.GITHUB_SHA??null,pending_read_tracks:plan.filter(i=>i.lessonKey==='bhw-legal-role'&&i.action!=='skip').map(i=>`${i.lessonKey}/${i.sectionId}/${i.language}`),records:[]};
function save(){writeFileSync(path.join(root,'docs/lesson-141-audio-review.json'),JSON.stringify(report,null,2)+'\n');}
function outputText(value){if(typeof value==='string')return value;if(Array.isArray(value))return value.map(outputText).filter(Boolean).join('\n');if(!value||typeof value!=='object')return '';if(typeof value.output_text==='string')return value.output_text;if(value.type==='text'&&typeof value.text==='string')return value.text;return outputText(value.outputs??value.output??value.content??value.steps?.filter(s=>s.type==='model_output')??[]);}
for(const record of records){
 const prompt=`Analyze the attached actual ${record.language==='fil'?'Filipino (Tagalog)':'Philippine English'} educational narration. First transcribe what you hear completely, without inventing words. Report whether speech is audible throughout, any truncated words or clipped ending, awkward initialism/name pronunciation (Demi, BHW, BHS), pacing, natural pitch/pace variation and whether the observation and coordination questions have natural expression. Flag concrete timestamps for concerns and uncertainty. Return a JSON object with transcript, speech_present, clipped_ending, delivery, pronunciation_concerns, other_concerns. Do not claim human listening or approval. This audio is fictional training material with no real patient data.`;
 let reviewed;
 for(let attempt=0;attempt<3;attempt++){
  // Build-time review of fictional, admin-authored training media only; follows the existing TTS provider exception. Never learner input or patient data.
  // eslint-disable-next-line no-restricted-syntax
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,input:[{type:'text',text:prompt},{type:'audio',data:readFileSync(record.file).toString('base64'),mime_type:'audio/mp3'}],generation_config:{temperature:0}}),signal:AbortSignal.timeout(180000)});
  if(response.ok){const result=await response.json();reviewed=outputText(result);if(!reviewed)throw new Error('No model review text');break;}
  if(attempt<2&&(response.status===429||response.status>=500)){await new Promise(r=>setTimeout(r,4000*(attempt+1)));continue;}
  reviewed=`Review unavailable: HTTP ${response.status}`;break;
 }
 report.records.push({id:record.id,language:record.language,sha256:sha(record.file),expected_text:record.expected,model_response:reviewed});save();console.log('Model-reviewed '+record.id);
}
save();

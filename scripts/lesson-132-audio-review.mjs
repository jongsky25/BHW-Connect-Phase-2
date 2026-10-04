// Build-time review of authored, non-personal lesson media only.
// Model-mediated listening is not human review, owner approval or proof of exact speech.
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(readFileSync(path.join(root,'content/training/day1-basic-competencies/narration.json'),'utf8'));
const files=[];
for(const [id,langs] of Object.entries(manifest.lessons['bhs-support-environment'].sections))for(const [language,t] of Object.entries(langs))files.push({id:`read-${id}-${language}`,language,file:path.join(root,'public',t.src.slice(1)),script:t.timings.map(t=>t.text).join(' ')});
for(const language of ['fil','en']){const dir=path.join(root,'remotion/public/bhs-support-environment');const t=JSON.parse(readFileSync(path.join(dir,`narration-${language}.json`),'utf8'));files.push({id:`story-${language}`,language,file:path.join(dir,`narration-${language}.mp3`),script:t.beats.map(t=>t.text).join(' ')});}
const result={date:new Date().toISOString(),method:'Gemini 3.8 Flash audio understanding; model-mediated, not human listening or owner approval',model:'gemini-3.8-flash',api_documentation:'https://ai.google.dev/gemini-api/docs/generate-content/audio',reports:[]};
for(const item of files){
 const audio=readFileSync(item.file);
 const prompt=`Listen to the attached ${item.language} lesson narration. Assess actual heard speech, not just the supplied script. Transcribe it, then compare against this expected authored script: ${item.script}\nReport omissions, added words, clipped endings, unnatural pauses, pronunciation issues (especially Mimi, BHW, BHS, RA 10028, DOH DC 2021-0486 where present), and warm expressive delivery. Do not claim word-perfect certainty. Return JSON with transcription, intelligibility, delivery, issues (array), and owner_listening_focus.`;
 let response;
 for(let attempt=0;attempt<4;attempt++){
  // eslint-disable-next-line no-restricted-syntax
  response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:'audio/mp3',data:audio.toString('base64')}}]}],generationConfig:{responseMimeType:'application/json'}})});
  if(response.ok)break;
  if(response.status!==429&&response.status<500)throw Error(`Audio review HTTP ${response.status}`);
  await new Promise(resolve=>setTimeout(resolve,3000*(attempt+1)));
 }
 if(!response?.ok)throw Error(`Audio review unavailable: ${response?.status}`);
 const body=await response.json();const text=body.candidates?.[0]?.content?.parts?.map(p=>p.text??'').join('');
 if(!text)throw Error('Audio review returned no text');
 result.reports.push({id:item.id,language:item.language,sha256:createHash('sha256').update(audio).digest('hex'),report:JSON.parse(text)});
 writeFileSync(path.join(root,'remotion/public/bhs-support-environment/audio-review.json'),JSON.stringify(result,null,2)+'\n');
 console.log(`Reviewed ${item.id}`);
}

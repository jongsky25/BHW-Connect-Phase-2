// Independent focused pass over decoded excerpts of draft MP3s, not human listening.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync}from 'node:child_process';import {createRequire}from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),model='gemini-3.8-flash';
const require=createRequire(root+'/remotion/package.json');
const {getExecutablePath}=require(path.join(path.dirname(require.resolve('@remotion/renderer')),'compositor/get-executable-path.js'));
const ffmpeg=getExecutablePath({indent:false,logLevel:'error',type:'ffmpeg',binariesDirectory:null});
const mf=JSON.parse(fs.readFileSync(root+'/content/training/day1-basic-competencies/narration.json','utf8'));
const tracks=mf.lessons['bhw-eligibility'].sections;
const requests=[
 {id:'citation-en',section:'section-4',language:'en',start:0,end:14,question:'Transcribe the exact legal citation. Is the letter d audible, and is it read as paragraph d, subscript d, or something else? Distinguish awkwardness from a changed legal reference.'},
 {id:'card-a-en',section:'bhwe-application-check',language:'en',start:0,end:11,question:'Transcribe the words naming the fictional practice card and its two service numbers. Do you hear Card A, cadre, or an ambiguous boundary? Describe audible evidence and uncertainty.'},
 {id:'check-voice-fil-opening',section:'bhwe-application-check',language:'fil',start:0,end:12,question:'Transcribe all speech and assess whether the heading and following sentence differ in pitch/register or are clearly different speakers. Do not infer speaker gender solely from pitch; state uncertainty.'},
 {id:'check-voice-fil-middle',section:'bhwe-application-check',language:'fil',start:20,end:30,question:'Transcribe all speech and assess whether vocal changes are pitch/register variation or clearly different speakers. Do not infer speaker gender solely from pitch; state uncertainty.'},
 {id:'check-voice-fil-ending',section:'bhwe-application-check',language:'fil',start:35,end:45,question:'Transcribe all speech and assess vocal consistency and whether the last syllable is complete. Do not infer speaker gender solely from pitch; state uncertainty.'},
];
const report={date:new Date().toISOString(),source_commit:process.env.GITHUB_SHA??null,model,method:'Focused model review of decoded actual MP3 excerpts; first-pass responses retained separately. No human listening or owner approval.',records:[]};
for(const q of requests){const t=tracks[q.section][q.language],file=root+'/public'+t.src;
 const excerpt=execFileSync(ffmpeg,['-v','error','-ss',String(q.start),'-i',file,'-t',String(q.end-q.start),'-f','wav','-acodec','pcm_s16le','-ac','1','-ar','24000','pipe:1'],{maxBuffer:8e6});
 // Admin-authored fictional training media only, never learner/patient data.
 // eslint-disable-next-line no-restricted-syntax
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,input:[{type:'text',text:q.question+' Return JSON with transcript, observations and uncertainty. Timestamps are relative to this excerpt. Do not presume an earlier analysis was correct.'},{type:'audio',data:excerpt.toString('base64'),mime_type:'audio/wav'}],generation_config:{temperature:0}}),signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw Error('Focused review HTTP '+response.status);
 const result=await response.json();
 const responseText=(result.steps??[]).filter(s=>s.type==='model_output').flatMap(s=>s.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
 if(!responseText)throw Error('Focused model response contains no text');
 report.records.push({...q,source_path:t.src,source_sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),excerpt_sha256:crypto.createHash('sha256').update(excerpt).digest('hex'),model_response:responseText});
 fs.writeFileSync(root+'/docs/lesson-143-audio-focus.json',JSON.stringify(report,null,2)+'\n');console.log('Focused review '+q.id);
}

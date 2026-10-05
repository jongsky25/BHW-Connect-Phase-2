// Independent focused pass over decoded excerpts of draft MP3s, not human listening.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync}from 'node:child_process';import {createRequire}from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),model='gemini-3.8-flash';
const require=createRequire(root+'/remotion/package.json');
const {getExecutablePath}=require(path.join(path.dirname(require.resolve('@remotion/renderer')),'compositor/get-executable-path.js'));
const ffmpeg=getExecutablePath({indent:false,logLevel:'error',type:'ffmpeg',binariesDirectory:null});
const mf=JSON.parse(fs.readFileSync(root+'/content/training/day1-basic-competencies/narration.json','utf8'));
const tracks=mf.lessons['bhw-follow-up'].sections;
const requests=[];
for(const language of ['fil','en'])for(const section of ['section-6','section-7','next-contact-plan','follow-up-application-check']){
 const track=tracks[section][language];
 const question=track.timings.find(z=>z.zone==='body'&&/[?？]/.test(z.text))??track.timings.find(z=>z.zone==='body');
 if(question)requests.push({id:section+'-decisive-'+language,section,language,start:question.start_ms/1000,end:question.end_ms/1000,question:'Transcribe all speech exactly without guessing from context. Are the question, unknown facts, negation and next-step distinction intelligible? Describe concrete defects and uncertainty.'});
 requests.push({id:section+'-ending-'+language,section,language,ending:true,question:'Transcribe all final speech exactly. Is the negation and final wording complete without clipping or false starts? Describe concrete defects and uncertainty.'});
}
const report={date:new Date().toISOString(),source_commit:process.env.GITHUB_SHA??null,model,method:'Focused model review of decoded actual MP3 excerpts; first-pass responses retained separately. No human listening or owner approval.',records:[]};
for(const q of requests){const t=tracks[q.section][q.language],file=root+'/public'+t.src;
 if(q.ending){q.start=Math.max(0,t.duration_seconds-16);q.end=t.duration_seconds;}
 const excerpt=execFileSync(ffmpeg,['-v','error','-ss',String(q.start),'-i',file,'-t',String(q.end-q.start),'-f','wav','-acodec','pcm_s16le','-ac','1','-ar','24000','pipe:1'],{maxBuffer:8e6});
 // Admin-authored fictional training media only, never learner/patient data.
 // eslint-disable-next-line no-restricted-syntax
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,input:[{type:'text',text:q.question+' Return JSON with transcript, observations and uncertainty. Timestamps are relative to this excerpt. Do not presume an earlier analysis was correct.'},{type:'audio',data:excerpt.toString('base64'),mime_type:'audio/wav'}],generation_config:{temperature:0}}),signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw Error('Focused review HTTP '+response.status);
 const result=await response.json();
 const responseText=(result.steps??[]).filter(s=>s.type==='model_output').flatMap(s=>s.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
 if(!responseText)throw Error('Focused model response contains no text');
 report.records.push({...q,source_path:t.src,source_sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),excerpt_sha256:crypto.createHash('sha256').update(excerpt).digest('hex'),model_response:responseText});
 fs.writeFileSync(root+'/docs/lesson-145-audio-focus.json',JSON.stringify(report,null,2)+'\n');console.log('Focused review '+q.id);
}

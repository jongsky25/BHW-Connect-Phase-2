// Model review of exact encoded bytes and measured WAV excerpts; never human signoff.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {loadReferenceModule} from './lib/reference-content.mjs';
import {planReferenceNarration} from './lib/reference-narration.mjs';
const root=path.resolve(import.meta.dirname,'..'),dir=root+'/.preview/lesson183-audio';fs.mkdirSync(dir,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const model='gemini-3.8-flash',promptRevision='apple-readiness-v1';
const prompt='Transcribe this actual Filipino/Tagalog or Philippine English fictional educational audio completely without guessing. Assess audible speech, Apple and BHW pronunciation where present, task scope, readiness verification versus assumption, permission versus proposal, negation, qualifications, unknown route/contact, and ending completeness. Flag clipped speech, timbre changes, meaning errors and uncertainty with timestamps relative to the attached recording. Return JSON with transcript, speech_present, pronunciation_concerns, meaning_concerns, delivery_concerns, clipped_ending and uncertainty. This is model review, not human listening, owner approval or clinical signoff.';
const reportPath=root+'/docs/lesson-183-audio-review.json';
const prior=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath)):null;
const mf=JSON.parse(fs.readFileSync(root+'/content/training/day1-basic-competencies/narration.json'));
const {lessons}=loadReferenceModule(root+'/content/training/day1-basic-competencies/modules/08-osh',root+'/public');
const plan=planReferenceNarration([{key:'08-osh',lessons}],mf,src=>fs.existsSync(root+'/public'+src)?sha(fs.readFileSync(root+'/public'+src)):null).filter(i=>i.lessonKey==='safety-prepare');
assert.equal(plan.length,12);assert(plan.every(i=>i.action==='skip'),'All current Read tracks required before review');
const report={prompt_revision:promptRevision,prompt_sha256:sha(Buffer.from(prompt)),model,source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'Exact Read MP3 and four measured zone-boundary PCM WAV excerpts per recording. Model-mediated; not human listening or clinical/owner approval.',story_aac_review:'blocked: no rendered story',records:[]};
const save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
function output(value){if(typeof value==='string')return value;if(Array.isArray(value))return value.map(output).filter(Boolean).join('\n');if(!value||typeof value!=='object')return '';if(value.type==='text')return value.text??'';return output(value.outputs??value.output??value.content??value.steps?.filter(s=>s.type==='model_output')??[]);}
async function review(file,mime,expected,old){
 const bytes=fs.readFileSync(file),h=sha(bytes);
 if(prior?.prompt_revision===promptRevision&&prior?.prompt_sha256===report.prompt_sha256&&prior?.model===model&&old?.sha256===h&&old.expected===expected&&old.status==='reviewed')return {...old,reused_exact_bytes:true};
 if(!process.env.GEMINI_API_KEY)throw Error('Gemini review credential unavailable');
 let record={file:path.relative(root,file),sha256:h,bytes:bytes.length,expected,status:'pending'};
 for(let attempt=0;attempt<3;attempt++){
  // Build-time fictional authored media only; no learner or patient input.
  // eslint-disable-next-line no-restricted-syntax
  const res=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,input:[{type:'text',text:prompt},{type:'audio',data:bytes.toString('base64'),mime_type:mime}],generation_config:{temperature:0}}),signal:AbortSignal.timeout(180000)});
  if(res.ok){const value=await res.json();record.response=output(value);record.status=record.response?'reviewed':'failed_empty_response';return record;}
  record.status='failed';record.http_status=res.status;
  if(attempt<2&&(res.status===429||res.status>=500)){await new Promise(r=>setTimeout(r,4000*(attempt+1)));continue;}return record;
 }
 return record;
}
for(const item of plan){
 const track=item.existing,id=`${item.sectionId}-${item.language}`,file=root+'/public'+track.src;
 const old=prior?.records?.find(r=>r.id===id);
 const record={id,language:item.language,encoded_sha256:sha(fs.readFileSync(file)),full:await review(file,'audio/mp3',item.zones.map(z=>z.text).join(' '),old?.full),excerpts:[]};
 report.records.push(record);save();
 const timings=track.timings;
 const name=timings.find(t=>/Apple/.test(t.text))??timings.find(t=>t.zone==='body')??timings[0];
 const meaning=timings.find(t=>/“|”|verification|beripika|role-play|feedback/.test(t.text))??timings[1]??timings[0];
 const negation=timings.find(t=>/hindi|Huwag|not |unknown|unconfirmed|pause/i.test(t.text))??timings[1]??timings[0];
 const groups=[['name',name],['meaning',meaning],['qualification',negation],['ending',timings.at(-1)]];
 for(const [kind,t]of groups){
  const excerpt=dir+'/'+id+'-'+kind+'.wav';
  execFileSync('ffmpeg',['-v','error','-ss',String(t.start_ms/1000),'-i',file,'-t',String((t.end_ms-t.start_ms)/1000),'-ac','1','-ar','24000','-c:a','pcm_s16le','-y',excerpt]);
  record.excerpts.push({kind,start_ms:t.start_ms,end_ms:t.end_ms,name_present:/Apple/.test(t.text),...await review(excerpt,'audio/wav',t.text,old?.excerpts?.find(e=>e.kind===kind))});save();
 }
 console.log('Reviewed full and four focused recordings: '+id);
}
report.full_count=report.records.filter(r=>r.full.status==='reviewed').length;
report.focused_count=report.records.flatMap(r=>r.excerpts).filter(r=>r.status==='reviewed').length;
report.status=report.full_count===12&&report.focused_count===48?'read_reviews_recorded':'incomplete';save();
if(report.status==='incomplete')throw Error('Incomplete actual Read model reviews');

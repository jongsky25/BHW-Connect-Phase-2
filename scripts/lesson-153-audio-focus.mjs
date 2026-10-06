// Decode and review actual Read MP3s and the shipped videos' AAC, with excerpts.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),model='gemini-3.8-flash';
const require=createRequire(root+'/remotion/package.json');
const {getExecutablePath}=require(path.join(path.dirname(require.resolve('@remotion/renderer')),'compositor/get-executable-path.js'));
const ffmpeg=getExecutablePath({indent:false,logLevel:'error',type:'ffmpeg',binariesDirectory:null});
const decoderVersion=execFileSync(ffmpeg,['-version'],{encoding:'utf8'}).split('\n')[0];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const j=p=>JSON.parse(fs.readFileSync(root+'/'+p,'utf8'));
const manifest=j('content/training/day1-basic-competencies/narration.json'),lesson=j('content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-local-partners/lesson.json');
const story=lesson.assets.find(a=>a.id==='bhw-local-partners-story');if(!story)throw Error('Actual shipped stories unavailable');
const prior=fs.existsSync(root+'/docs/lesson-153-audio-focus.json')?j('docs/lesson-153-audio-focus.json'):null;
const records=[];
for(const language of ['fil','en']){
 for(const [section,langs]of Object.entries(manifest.lessons['bhw-local-partners'].sections)){
  const t=langs[language];records.push({id:`read-${section}-${language}`,language,file:root+'/public'+t.src,source_path:t.src,timings:t.timings,duration:t.duration_seconds});
 }
 const timing=j(`remotion/public/bhw-local-partners/narration-${language}.json`);
 records.push({id:`shipped-story-${language}`,language,file:root+'/public'+story.videos[language].path,source_path:story.videos[language].path,timings:timing.beats,duration:timing.durationSeconds});
}
const decodeOnly=process.env.LESSON153_DECODE_ONLY==='1';
const decodedDir=root+'/.preview/lesson153-decoded';fs.mkdirSync(decodedDir,{recursive:true});
function pcm(wav){if(wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw Error('Not a RIFF WAV');let format=null;for(let offset=12;offset+8<=wav.length;){const id=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4),start=offset+8;if(id==='fmt ')format={codec:wav.readUInt16LE(start),channels:wav.readUInt16LE(start+2),rate:wav.readUInt32LE(start+4),bits:wav.readUInt16LE(start+14)};if(id==='data'){if(!format||format.codec!==1||format.channels!==1||format.rate!==24000||format.bits!==16||start+size>wav.length||size%2)throw Error('Invalid mono24kHz16-bit PCM WAV');return wav.subarray(start,start+size);}offset=start+size+(size%2);}throw Error('PCM data chunk unavailable');}
const dir=root+'/.preview/lesson153-excerpts';fs.mkdirSync(dir,{recursive:true});
const report={date:new Date().toISOString(),source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),model,decode_only:decodeOnly,decoder_version:decoderVersion,method:'Decode every shipped Read MP3 and both actual videos AAC; full PCM energy plus zone metrics, and model-reviewed focused WAV excerpts. Model analysis is not human listening or owner/SME approval.',records:[]};
const save=()=>fs.writeFileSync(root+(decodeOnly?'/docs/lesson-153-audio-decode.json':'/docs/lesson-153-audio-focus.json'),JSON.stringify(report,null,2)+'\n');
function stats(pcm){let sum=0,peak=0,quiet=0;for(let i=0;i+1<pcm.length;i+=2){const n=pcm.readInt16LE(i)/32768;sum+=n*n;if(Math.abs(n)<0.001)quiet++;peak=Math.max(peak,Math.abs(n));}return{samples:pcm.length/2,seconds:pcm.length/48000,rms:Math.sqrt(sum/Math.max(1,pcm.length/2)),peak,quiet_sample_fraction:quiet/Math.max(1,pcm.length/2)};}
for(const record of records){
 const sourceHash=sha(fs.readFileSync(record.file));
 const decodedFile=decodedDir+'/'+record.id+'.wav';execFileSync(ffmpeg,['-v','error','-i',record.file,'-vn','-f','wav','-acodec','pcm_s16le','-ac','1','-ar','24000','-y',decodedFile]);
 const decoded=pcm(fs.readFileSync(decodedFile));
 const full=stats(decoded);if(full.rms<0.002||full.samples<1)throw Error('Silent or empty shipped audio: '+record.id);
 const zones=record.timings.map(t=>({...t,...stats(decoded.subarray(Math.round(t.start_ms*24)*2,Math.min(decoded.length,Math.round(t.end_ms*24)*2)))}));
 if(zones.some((z,i)=>i>0&&z.start_ms<zones[i-1].end_ms||!Number.isFinite(z.start_ms)||!Number.isFinite(z.end_ms)||z.end_ms<=z.start_ms||z.samples<1||z.rms<0.001))throw Error('Invalid or silent narration zone: '+record.id);
 const reviewZones=record.timings.filter(z=>z.zone==='body'||record.id.startsWith('shipped-story'));
 const question=reviewZones.find(z=>/[?？]/.test(z.text))??reviewZones[0];
 const qi=record.timings.indexOf(question),endIndex=record.timings.findIndex(z=>z.end_ms>=record.duration*1000-15000);
 const requests=[{kind:'decisive',start:record.timings[Math.max(0,qi-1)].start_ms/1000,end:record.timings[Math.min(record.timings.length-1,qi+1)].end_ms/1000},{kind:'ending',start:record.timings[Math.max(0,endIndex)].start_ms/1000,end:full.seconds}];
 if(record.id==='read-local-partners-application-check-fil')requests.push({kind:'opening-voice',start:0,end:record.timings[Math.min(2,record.timings.length-1)].end_ms/1000});
 if(record.id==='read-barangay-support-request-en'){
  const at=record.timings.findIndex(t=>t.text.includes('unconfirmed')||t.text.includes('known facts'));
  if(at>=0)requests.push({kind:'facts-versus-unknowns',start:record.timings[Math.max(0,at-1)].start_ms/1000,end:record.timings[Math.min(record.timings.length-1,at+1)].end_ms/1000});
 }
 const reviewed={id:record.id,language:record.language,source_path:record.source_path,source_sha256:sourceHash,decoded_pcm_sha256:sha(decoded),full_audio_metrics:full,zones,excerpts:[]};
 report.records.push(reviewed);save();
 for(const q of requests){
  const name=record.id+'-'+q.kind+'.wav',excerptFile=dir+'/'+name;
  execFileSync(ffmpeg,['-v','error','-ss',String(q.start),'-i',record.file,'-t',String(q.end-q.start),'-vn','-f','wav','-acodec','pcm_s16le','-ac','1','-ar','24000','-y',excerptFile]);
  const wav=fs.readFileSync(excerptFile),excerptHash=sha(wav),old=prior?.model===model?prior.records?.find(r=>r.id===record.id&&r.source_sha256===sourceHash)?.excerpts?.find(e=>e.kind===q.kind&&e.excerpt_sha256===excerptHash&&e.start===q.start&&e.end===q.end):null;
  const excerptSamples=pcm(wav).length/2;
  if(decodeOnly){reviewed.excerpts.push({...q,file:name,excerpt_sha256:excerptHash,decoded_sample_count:excerptSamples,model_response:null});save();continue;}
  if(old?.model_response&&old?.raw_request&&old?.raw_response){reviewed.excerpts.push({...old,decoded_sample_count:excerptSamples,reused_exact_encoded_bytes:true});save();console.log('Reused focused review for exact bytes '+record.id+' '+q.kind);continue;}

  const prompt=`This is ${record.language==='fil'?'Filipino/Tagalog':'Philippine English'} fictional educational audio. The excerpt begins on a measured speech-zone boundary. Transcribe every audible word without guessing. Assess Malou pronunciation (mah-LOO), negation, role distinctions, ending completeness, audible speech, clipped words and unexpected voice changes. Report concrete timestamps relative to this excerpt and uncertainty. Do not presume previous analysis. Return JSON with transcript, observations, possible_defects and uncertainty. This is model assessment, not human approval.`;
  // Fictional authored training audio only, never learner/patient data.
  const requestBody=JSON.stringify({model,input:[{type:'text',text:prompt},{type:'audio',data:wav.toString('base64'),mime_type:'audio/wav'}],generation_config:{temperature:0}});
  // Admin-authored fictional training media only; no learner or patient input.
  // eslint-disable-next-line no-restricted-syntax
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:requestBody,signal:AbortSignal.timeout(180000)});
  const responseBody=await response.text();
  if(!response.ok)throw Error('Focused model review HTTP '+response.status);
  const result=JSON.parse(responseBody);
  const text=(result.steps??[]).filter(s=>s.type==='model_output').flatMap(s=>s.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');if(!text)throw Error('Focused review has no text');
  reviewed.excerpts.push({...q,file:name,excerpt_sha256:excerptHash,decoded_sample_count:excerptSamples,expected_context:record.timings.filter(t=>t.end_ms>=q.start*1000&&t.start_ms<=q.end*1000).map(t=>t.text).join(' '),model_response:text,raw_request:requestBody,raw_response:responseBody,http_status:response.status,request_sha256:sha(Buffer.from(requestBody)),response_sha256:sha(Buffer.from(responseBody))});save();console.log('Decoded and focused-reviewed '+record.id+' '+q.kind);
 }
}

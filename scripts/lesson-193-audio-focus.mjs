// Decode and review actual Read MP3s and the shipped videos' AAC, with excerpts.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),model='gemini-3.8-flash',promptRevision='charlaine-safety-demonstration-v1';
const require=createRequire(root+'/remotion/package.json');
const {getExecutablePath}=require(path.join(path.dirname(require.resolve('@remotion/renderer')),'compositor/get-executable-path.js'));
const ffmpeg=getExecutablePath({indent:false,logLevel:'error',type:'ffmpeg',binariesDirectory:null});
const decoderVersion=execFileSync(ffmpeg,['-version'],{encoding:'utf8'}).split('\n')[0];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const j=p=>JSON.parse(fs.readFileSync(root+'/'+p,'utf8'));
const manifest=j('content/training/day1-basic-competencies/narration.json'),lesson=j('content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/lesson.json');
const story=lesson.assets.find(a=>a.id==='resources-monitor-story');// A missing story stays an explicit completeness blocker; independently review available Read bytes.
const prior=fs.existsSync(root+'/docs/lesson-193-audio-focus.json')?j('docs/lesson-193-audio-focus.json'):null;
const records=[];
for(const language of ['fil','en']){
 for(const [section,langs]of Object.entries(manifest.lessons['resources-monitor'].sections)){
  const t=langs[language];records.push({id:`read-${section}-${language}`,language,file:root+'/public'+t.src,source_path:t.src,timings:t.timings,duration:t.duration_seconds});
 }
 if (!story?.videos?.[language]) continue;
 const timing=j(`remotion/public/resources-monitor/narration-${language}.json`);
 records.push({id:`shipped-story-${language}`,language,file:root+'/public'+story.videos[language].path,source_path:story.videos[language].path,timings:timing.beats,duration:timing.durationSeconds});
}
const decodeOnly=process.env.LESSON193_DECODE_ONLY==='1';
const decodedDir=root+'/.preview/lesson193-decoded';fs.mkdirSync(decodedDir,{recursive:true});
function pcm(wav){if(wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw Error('Not a RIFF WAV');let format=null;for(let offset=12;offset+8<=wav.length;){const id=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4),start=offset+8;if(id==='fmt ')format={codec:wav.readUInt16LE(start),channels:wav.readUInt16LE(start+2),rate:wav.readUInt32LE(start+4),bits:wav.readUInt16LE(start+14)};if(id==='data'){if(!format||format.codec!==1||format.channels!==1||format.rate!==24000||format.bits!==16||start+size>wav.length||size%2)throw Error('Invalid mono24kHz16-bit PCM WAV');return wav.subarray(start,start+size);}offset=start+size+(size%2);}throw Error('PCM data chunk unavailable');}
const dir=root+'/.preview/lesson193-excerpts';fs.mkdirSync(dir,{recursive:true});
const report={prompt_revision:promptRevision,date:new Date().toISOString(),source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),model,expected_full_recordings:16,expected_focused_excerpts:64,missing_story:!story,decode_only:decodeOnly,decoder_version:decoderVersion,method:'Decode every shipped Read MP3 and both actual videos AAC; full PCM energy plus zone metrics, and model-reviewed focused WAV excerpts. Model analysis is not human listening or owner/SME approval.',records:[]};
const save=()=>fs.writeFileSync(root+(decodeOnly?'/docs/lesson-193-audio-decode.json':'/docs/lesson-193-audio-focus.json'),JSON.stringify(report,null,2)+'\n');
function stats(pcm){let sum=0,peak=0,quiet=0;for(let i=0;i+1<pcm.length;i+=2){const n=pcm.readInt16LE(i)/32768;sum+=n*n;if(Math.abs(n)<0.001)quiet++;peak=Math.max(peak,Math.abs(n));}return{samples:pcm.length/2,seconds:pcm.length/48000,rms:Math.sqrt(sum/Math.max(1,pcm.length/2)),peak,quiet_sample_fraction:quiet/Math.max(1,pcm.length/2)};}
for(const record of records){
 const sourceHash=sha(fs.readFileSync(record.file));
 const decodedFile=decodedDir+'/'+record.id+'.wav';execFileSync(ffmpeg,['-v','error','-i',record.file,'-vn','-f','wav','-acodec','pcm_s16le','-ac','1','-ar','24000','-y',decodedFile]);
 const decoded=pcm(fs.readFileSync(decodedFile));
 const full=stats(decoded);if(full.rms<0.002||full.samples<1)throw Error('Silent or empty shipped audio: '+record.id);
 const zones=record.timings.map(t=>({...t,...stats(decoded.subarray(Math.round(t.start_ms*24)*2,Math.min(decoded.length,Math.round(t.end_ms*24)*2)))}));
 if(zones.some((z,i)=>i>0&&z.start_ms<zones[i-1].end_ms||!Number.isFinite(z.start_ms)||!Number.isFinite(z.end_ms)||z.end_ms<=z.start_ms||z.samples<1||z.rms<0.001))throw Error('Invalid or silent narration zone: '+record.id);
 const reviewZones=record.timings.filter(z=>z.zone==='body'||record.id.startsWith('shipped-story'));
 const endIndex=record.timings.findIndex(z=>z.end_ms>=record.duration*1000-15000);
 const critical=record.timings.findIndex(z=>/hindi|huwag|not |do not|without|agarang|immediate/i.test(z.text));
 const body=reviewZones[0]??record.timings[0];
 const requests=[
  {kind:'name',start:record.timings[Math.max(0,record.timings.findIndex(t=>/Charlaine/.test(t.text)))].start_ms/1000,end:record.timings[Math.max(0,record.timings.findIndex(t=>/Charlaine/.test(t.text)))].end_ms/1000},
  {kind:'body',start:body.start_ms/1000,end:body.end_ms/1000},
  {kind:'critical',start:record.timings[Math.max(0,critical)].start_ms/1000,end:record.timings[Math.min(record.timings.length-1,Math.max(0,critical)+1)].end_ms/1000},
  {kind:'ending',start:record.timings[Math.max(0,endIndex)].start_ms/1000,end:full.seconds}
 ];
 const reviewed={id:record.id,language:record.language,source_path:record.source_path,source_sha256:sourceHash,decoded_pcm_sha256:sha(decoded),full_audio_metrics:full,zones,excerpts:[]};
 report.records.push(reviewed);save();
 for(const q of requests){
  const name=record.id+'-'+q.kind+'.wav',excerptFile=dir+'/'+name;
  execFileSync(ffmpeg,['-v','error','-ss',String(q.start),'-i',record.file,'-t',String(q.end-q.start),'-vn','-f','wav','-acodec','pcm_s16le','-ac','1','-ar','24000','-y',excerptFile]);
  const wav=fs.readFileSync(excerptFile),excerptHash=sha(wav);
  const priorRecord=prior?.model===model&&prior?.prompt_revision===promptRevision?prior.records?.find(r=>r.id===record.id&&(r.source_sha256===sourceHash||r.decoded_pcm_sha256===sha(decoded))):null;
  const old=priorRecord?.excerpts?.find(e=>e.kind===q.kind&&e.excerpt_sha256===excerptHash&&e.start===q.start&&e.end===q.end);
  const excerptSamples=pcm(wav).length/2;
  if(decodeOnly){reviewed.excerpts.push({...q,file:name,excerpt_sha256:excerptHash,decoded_sample_count:excerptSamples,model_response:null});save();continue;}
  if(old?.model_response){const retained={...old};delete retained.reused_exact_encoded_bytes;reviewed.excerpts.push({...retained,decoded_sample_count:excerptSamples,reused_exact_wav_excerpt:true,reused_same_encoded_source:priorRecord.source_sha256===sourceHash});save();console.log('Reused focused review for exact bytes '+record.id+' '+q.kind);continue;}

  if(!process.env.GEMINI_API_KEY)throw Error('Gemini credential required for an uncached exact WAV excerpt');
  const prompt=`This is ${record.language==='fil'?'Filipino/Tagalog':'Philippine English'} fictional educational audio. The excerpt begins on a measured speech-zone boundary. Transcribe every audible word without guessing. Assess Charlaine pronunciation, numbers and denominators, reprints versus costs, negation and qualification, pending permission, workload/quality distinctions, ending completeness, audible speech, clipped words and unexpected voice changes. Report concrete timestamps relative to this excerpt and uncertainty. Do not presume previous analysis. Return JSON with transcript, observations, possible_defects and uncertainty. This is model assessment, not human approval.`;
  // Fictional authored training audio only, never learner/patient data.
  let response;
  for(let attempt=0;attempt<3;attempt++){
    // eslint-disable-next-line no-restricted-syntax
    response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,input:[{type:'text',text:prompt},{type:'audio',data:wav.toString('base64'),mime_type:'audio/wav'}],generation_config:{temperature:0}}),signal:AbortSignal.timeout(180000)});
    if(response.ok)break;
    if(attempt<2&&(response.status===429||response.status>=500)){await new Promise(resolve=>setTimeout(resolve,4000*(attempt+1)));continue;}
    break;
  }
  if (!response.ok) {
    const failureBody=await response.text();reviewed.excerpts.push({...q,file:name,excerpt_sha256:excerptHash,decoded_sample_count:excerptSamples,model_response:null,review_failure:'HTTP '+response.status,review_failure_body:failureBody});save();continue;
  }
  const result=await response.json();
  const text=(result.steps??[]).filter(s=>s.type==='model_output').flatMap(s=>s.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');if(!text)throw Error('Focused review has no text');
  reviewed.excerpts.push({...q,file:name,excerpt_sha256:excerptHash,decoded_sample_count:excerptSamples,expected_context:record.timings.filter(t=>t.end_ms>=q.start*1000&&t.start_ms<=q.end*1000).map(t=>t.text).join(' '),model_response:text});save();console.log('Decoded and focused-reviewed '+record.id+' '+q.kind);
 }
}

report.actual_recordings=report.records.length;report.actual_focused_excerpts=report.records.reduce((n,r)=>n+r.excerpts.length,0);report.successful_model_reviews=report.records.flatMap(r=>r.excerpts).filter(e=>e.model_response).length;report.provider_failures=report.records.flatMap(r=>r.excerpts).filter(e=>e.review_failure).length;report.status=decodeOnly?'decoded metrics only':report.provider_failures?'completed with retained provider failures':'model reviews complete; human listening and approval pending';save();

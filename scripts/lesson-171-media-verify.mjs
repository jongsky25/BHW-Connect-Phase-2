import {reviewed171} from './lib/lesson-171-integration.mjs';
// Actual committed media and historical selection checks; no fixtures, writes or approval.
import sharp from 'sharp';import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {execFileSync,spawnSync} from 'node:child_process';import {createRequire} from 'node:module';import path from 'node:path';
import {loadReferenceModule} from './lib/reference-content.mjs';import {planReferenceNarration,mp3AudioFrames} from './lib/reference-narration.mjs';
const j=p=>JSON.parse(reviewed171(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const b=j('docs/lesson-171-baseline.json'),m=j('content/training/day1-basic-competencies/narration.json'),allowed=new Set(['problem-define']);
for(const [k,v]of Object.entries(b.narration.lessons)){
 if(!allowed.has(k))assert.deepEqual(m.lessons[k],v,k);
 else {assert(m.history[k].some(h=>JSON.stringify(h)===JSON.stringify(v)),k+' complete predecessor selection');for(const langs of Object.values(v.sections))for(const t of Object.values(langs))assert.equal(sha('public'+t.src),t.sha256);}
}
for(const [k,v]of Object.entries(b.narration.history??{}))assert.deepEqual(allowed.has(k)?m.history[k].slice(0,v.length):m.history[k],v,k+' earlier history');
const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/07-problema','public');
const plan=planReferenceNarration([{key:'07-problema',lessons}],JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/narration.json')),src=>sha('public'+src));assert(plan.every(p=>p.action==='skip'),'Every current 1.7 track must match its exact new text');
const target=plan.filter(p=>p.lessonKey==='problem-define');assert.equal(target.length,12);
for(const p of target){assert.equal(p.voice,'gemini:gemini-3.8-flash-tts:Kore');assert.deepEqual(p.existing.timings.map(({zone,index,text})=>({zone,index,text})),p.zones);const seconds=mp3AudioFrames(fs.readFileSync('public'+p.src)).reduce((s,f)=>s+f.samples/f.sampleRate,0);assert(Math.abs(seconds-p.existing.duration_seconds)<0.001);assert(p.existing.timings.at(-1).end_ms<=seconds*1000+1);}
const lesson=j('content/training/day1-basic-competencies/modules/07-problema/lessons/problem-define/lesson.json');const story=lesson.assets.find(a=>a.id===lesson.featured_asset_id);assert.equal(story.review_status,'draft');
const require=createRequire(import.meta.url);
const renderer=require.resolve('@remotion/renderer',{paths:[path.resolve('remotion')]});
const {getExecutablePath}=require(path.join(path.dirname(renderer),'compositor/get-executable-path.js'));
const ffmpeg=getExecutablePath({indent:false,logLevel:'error',type:'ffmpeg',binariesDirectory:null});
const report={source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),stories:[],earlier_public_files:0};
for(const [p,h]of Object.entries(b.protected_sha256))if(p.startsWith('public/')){assert.equal(sha(p),h,p);report.earlier_public_files++;}
for(const lang of ['fil','en']){
 const v=story.videos[lang];for(const a of [v,v.poster,v.captions])assert.equal(sha('public'+a.path),a.content_hash);
 const t=j('remotion/public/problem-define/narration-'+lang+'.json');assert.equal(t.beats.length,6);assert.equal(sha('remotion/public/problem-define/narration-'+lang+'.mp3'),t.audio_sha256);
 const captions=fs.readFileSync('public'+v.captions.path,'utf8'),cues=captions.trim().split(/\n\n+/).slice(1);assert.equal(cues.length,6);
 const stamp=ms=>{const x=Math.round(ms);return [Math.floor(x/3600000),Math.floor(x/60000)%60,Math.floor(x/1000)%60].map(n=>String(n).padStart(2,'0')).join(':')+'.'+String(x%1000).padStart(3,'0');};
 for(const [i,beat]of t.beats.entries()){assert(cues[i].includes(stamp(beat.start_ms)+' --> '+stamp(beat.end_ms)));assert(cues[i].includes(beat.text));if(i)assert(beat.start_ms>=t.beats[i-1].end_ms);}
 const duration=(Math.round((t.durationSeconds*1000+1100)*30/1000))/30;assert.equal(v.duration_s,Math.round(duration));assert(t.beats.at(-1).end_ms<=t.durationSeconds*1000+50);assert(duration-t.beats.at(-1).end_ms/1000>=1);
 // Compare the actual encoded final frame to the shipped poster, allowing codec loss.
 const pixels=async(file,args)=>sharp(execFileSync(ffmpeg,['-v','error',...args,'-i',file,'-frames:v','1','-vf','scale=160:90','-f','image2pipe','-c:v','png','pipe:1'],{maxBuffer:1024*1024})).removeAlpha().raw().toBuffer();
 const ending=await pixels('public'+v.path,['-ss',String(duration-1/30)]),poster=await pixels('public'+v.poster.path,[]);assert.equal(ending.length,160*90*3);assert.equal(poster.length,ending.length);
 let mse=0;for(let i=0;i<ending.length;i++)mse+=((ending[i]-poster[i])/255)**2;mse/=ending.length;assert(mse<0.004,'Poster must match actual final video frame');
 const probe=spawnSync(ffmpeg,['-hide_banner','-i','public'+v.path,'-map','0','-c','copy','-f','null','-'],{encoding:'utf8'});assert.equal(probe.status,0);const media=probe.stderr;assert(/Video: h264/.test(media)&&/854x480/.test(media)&&/Audio: aac/.test(media));
 report.stories.push({language:lang,duration_seconds:duration,six_measured_captions:true,ending_postroll_seconds:duration-t.beats.at(-1).end_ms/1000,poster_final_frame_normalized_mse:mse,media});
}
fs.mkdirSync('.preview/lesson171-deliverables',{recursive:true});fs.writeFileSync('.preview/lesson171-deliverables/lesson-171-media-verification.json',JSON.stringify(report,null,2)+'\n');
console.log('Verified all current 1.7 narration, 12 measured target tracks, both six-cue stories and every historical predecessor mapping.');

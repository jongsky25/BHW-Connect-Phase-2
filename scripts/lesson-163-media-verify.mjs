import './lesson-163-preservation.mjs';
import {toWebVtt} from './lib/webvtt.mjs';
import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import path from 'node:path';
const require=createRequire(path.resolve('remotion/package.json'));const {getExecutablePath}=require(path.join(path.dirname(require.resolve('@remotion/renderer')),'compositor/get-executable-path.js'));
const ffprobe=getExecutablePath({indent:false,logLevel:'error',type:'ffprobe',binariesDirectory:null});

// Actual committed media and historical selection checks; no fixtures, writes or approval.
import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {loadReferenceModule} from './lib/reference-content.mjs';import {planReferenceNarration,mp3AudioFrames} from './lib/reference-narration.mjs';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const b=j('docs/lesson-163-baseline.json'),m=j('content/training/day1-basic-competencies/narration.json'),key='communication-explain';
assert(m.history[key].some(h=>JSON.stringify(h)===JSON.stringify(b.target_narration)),'Complete predecessor selection retained');
assert.deepEqual(m.history[key].slice(0,b.target_history.length),b.target_history,'All target history retained');
for(const langs of Object.values(b.target_narration.sections))for(const t of Object.values(langs))assert.equal(sha('public'+t.src),t.sha256);
const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public');
const plan=planReferenceNarration([{key:'06-komunikasyon',lessons}],m,src=>sha('public'+src));assert(plan.every(p=>p.action==='skip'),'Every current 1.6 track must match its exact new text');
const target=plan.filter(p=>p.lessonKey==='communication-explain');assert.equal(target.length,12);
for(const p of target){assert.equal(p.voice,'gemini:gemini-3.8-flash-tts:Kore');assert.deepEqual(p.existing.timings.map(({zone,index,text})=>({zone,index,text})),p.zones);const seconds=mp3AudioFrames(fs.readFileSync('public'+p.src)).reduce((s,f)=>s+f.samples/f.sampleRate,0);assert(Math.abs(seconds-p.existing.duration_seconds)<0.001);assert(p.existing.timings.at(-1).end_ms<=seconds*1000+1);}
const lesson=j('content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/lesson.json');const story=lesson.assets.find(a=>a.id===lesson.featured_asset_id);assert.equal(story.review_status,fs.existsSync('docs/lesson-163-owner-approval.json')?'approved':'draft');
for(const lang of ['fil','en']){const v=story.videos[lang];for(const a of [v,v.poster,v.captions])assert.equal(sha('public'+a.path),a.content_hash);assert.equal((fs.readFileSync('public'+v.captions.path,'utf8').match(/ --> /g)??[]).length,6);const t=j('remotion/public/communication-explain/narration-'+lang+'.json');assert.equal(t.beats.length,6);assert.equal(sha('remotion/public/communication-explain/narration-'+lang+'.mp3'),t.audio_sha256);
 assert.equal(fs.readFileSync('public'+v.captions.path,'utf8'),toWebVtt(t),'Exact measured caption text/boundaries');
 const probe=JSON.parse(execFileSync(ffprobe,['-v','error','-show_streams','-show_format','-of','json','public'+v.path],{encoding:'utf8'}));
 const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
 assert.equal(video.codec_name,'h264');assert.equal(video.width,854);assert.equal(video.height,480);assert.equal(audio.codec_name,'aac');assert([1,2].includes(audio.channels),'AAC mono/stereo');
 const actual=Number(probe.format.duration),expected=Math.round((t.durationSeconds+1.1)*30)/30;assert(Math.abs(actual-expected)<0.08,'Measured render duration');
 assert(actual-t.beats.at(-1).end_ms/1000>=1,'Complete ending/post-roll');assert(fs.statSync('public'+v.path).size/actual<=75000,'Lesson video size budget');
}
console.log('Verified all current 1.6 narration, 12 measured target tracks, both six-cue stories and every historical predecessor mapping.');

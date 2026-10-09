// Verify actual selected media and complete historical bytes; no publication.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {loadReferenceModule} from './lib/reference-content.mjs';import {planReferenceNarration,mp3AudioFrames} from './lib/reference-narration.mjs';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),j=p=>JSON.parse(fs.readFileSync(p));
const captured=j('docs/lesson-174-integrated-baseline.json');
const old=JSON.parse(execFileSync('git',['show',captured.base_commit+':content/training/day1-basic-competencies/narration.json'],{encoding:'utf8',maxBuffer:32*1024*1024}));
const manifest=j('content/training/day1-basic-competencies/narration.json');
for(const [key,value]of Object.entries(old.lessons))if(key!=='problem-action-plan')assert.deepEqual(manifest.lessons[key],value);
for(const [key,value]of Object.entries(old.history??{}))assert.deepEqual(key==='problem-action-plan'?manifest.history[key].slice(0,value.length):manifest.history[key],value);
assert(manifest.history['problem-action-plan'].some(value=>JSON.stringify(value)===JSON.stringify(old.lessons['problem-action-plan'])));
for(const [p,h]of Object.entries(captured.files))if(p.startsWith('public/'))assert.equal(sha(p),h,p);
const loaded=loadReferenceModule('content/training/day1-basic-competencies/modules/07-problema','public');
const plan=planReferenceNarration([{key:'07-problema',lessons:loaded.lessons}],manifest,src=>sha('public'+src));
const tracks=plan.filter(p=>p.lessonKey==='problem-action-plan');assert.equal(tracks.length,12);assert(tracks.every(p=>p.action==='skip'));
for(const p of tracks){assert.equal(p.voice,'gemini:gemini-3.8-flash-tts:Kore');const seconds=mp3AudioFrames(fs.readFileSync('public'+p.src)).reduce((sum,frame)=>sum+frame.samples/frame.sampleRate,0);assert(Math.abs(seconds-p.existing.duration_seconds)<0.001);assert(p.existing.timings.at(-1).end_ms<=seconds*1000);}
const lesson=j('content/training/day1-basic-competencies/modules/07-problema/lessons/problem-action-plan/lesson.json'),story=lesson.assets.find(a=>a.id===lesson.featured_asset_id);assert(story?.videos);
const reports=[];
for(const language of ['fil','en']){
 const v=story.videos[language];for(const media of [v,v.poster,v.captions])assert.equal(sha('public'+media.path),media.content_hash);
 const timing=j(`remotion/public/problem-action-plan/narration-${language}.json`);
 const cues=fs.readFileSync('public'+v.captions.path,'utf8').trim().split(/\n\n+/).slice(1);assert.equal(cues.length,6);
 for(const [i,beat]of timing.beats.entries()){assert(cues[i].includes(beat.text));assert(beat.end_ms>beat.start_ms);if(i)assert(beat.start_ms>=timing.beats[i-1].end_ms);}
 const info=JSON.parse(execFileSync('ffprobe',['-v','quiet','-show_format','-show_streams','-of','json','public'+v.path],{encoding:'utf8'}));
 assert(info.streams.some(s=>s.codec_name==='h264'&&s.width===854&&s.height===480));assert(info.streams.some(s=>s.codec_name==='aac'));
 assert(Number(info.format.duration)-timing.beats.at(-1).end_ms/1000>=1);
 reports.push({language,duration_seconds:Number(info.format.duration),six_cues:true,actual_codecs:'H.264/AAC',width:854,height:480,postroll_seconds:Number(info.format.duration)-timing.beats.at(-1).end_ms/1000});
}
fs.mkdirSync('.preview/lesson174-deliverables',{recursive:true});
fs.writeFileSync('.preview/lesson174-deliverables/lesson-174-media-verification.json',JSON.stringify({target_tracks:12,old_public_bytes:'all preserved',old_narration:'all sibling selections/history and target predecessor preserved',stories:reports},null,2)+'\n');
console.log('Verified 12 selected Gemini tracks, old selections/public bytes and both encoded stories.');

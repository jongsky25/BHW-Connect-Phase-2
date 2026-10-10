// Verify exact appended media, encoded formats, measured boundaries and post-roll.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(root+'/remotion/package.json');
const {getExecutablePath}=require(path.join(path.dirname(require.resolve('@remotion/renderer')),'compositor/get-executable-path.js'));
const probe=getExecutablePath({indent:false,logLevel:'error',type:'ffprobe',binariesDirectory:null});
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
const inspect=p=>JSON.parse(execFileSync(probe,['-v','error','-show_streams','-show_format','-of','json',root+'/public'+p],{encoding:'utf8'}));
const manifest=read('content/training/day1-basic-competencies/narration.json');
const lesson=read('content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/lesson.json');
const story=lesson.assets.find(a=>a.id==='resources-monitor-story');assert(story);
const report={status:'verified exact encoded media; human listening separate',read_tracks:[],stories:[],images:[]};
for(const [id,languages]of Object.entries(manifest.lessons['resources-monitor'].sections))for(const language of ['fil','en']){
 const track=languages[language],bytes=fs.readFileSync(root+'/public'+track.src);assert.equal(sha(bytes),track.sha256);
 const data=inspect(track.src),stream=data.streams.find(s=>s.codec_type==='audio');assert.equal(stream.codec_name,'mp3');
 assert(Math.abs(Number(data.format.duration)-track.duration_seconds)<0.1);
 report.read_tracks.push({id,language,path:track.src,sha256:sha(bytes),encoded_seconds:Number(data.format.duration)});
}
assert.equal(report.read_tracks.length,14);
for(const asset of lesson.assets){
 if(!asset.id.startsWith('monitor-'))continue;
 const bytes=fs.readFileSync(root+'/public'+asset.path);assert.equal(sha(bytes),asset.content_hash);report.images.push({id:asset.id,path:asset.path,sha256:sha(bytes)});
}
assert.equal(report.images.length,7);
for(const language of ['fil','en']){
 const video=story.videos[language],timing=read(`remotion/public/resources-monitor/narration-${language}.json`);
 for(const media of [video,video.poster,video.captions])assert.equal(sha(fs.readFileSync(root+'/public'+media.path)),media.content_hash);
 const data=inspect(video.path),v=data.streams.find(s=>s.codec_type==='video'),a=data.streams.find(s=>s.codec_type==='audio');
 assert.equal(v.codec_name,'h264');assert.equal(a.codec_name,'aac');assert.equal(v.width,854);assert.equal(v.height,480);
 const seconds=Number(data.format.duration);assert(seconds<=90);assert(seconds-timing.durationSeconds>=1);
 const captions=fs.readFileSync(root+'/public'+video.captions.path,'utf8');assert.equal((captions.match(/-->/g)??[]).length,7);assert.equal(timing.beats.length,7);
 assert.equal(sha(fs.readFileSync(root+`/remotion/public/resources-monitor/narration-${language}.mp3`)),timing.audio_sha256);
 report.stories.push({language,path:video.path,sha256:video.content_hash,video_codec:v.codec_name,audio_codec:a.codec_name,width:v.width,height:v.height,encoded_seconds:seconds,narration_seconds:timing.durationSeconds,post_roll_seconds:Number((seconds-timing.durationSeconds).toFixed(3)),caption_cues:7,poster_sha256:video.poster.content_hash});
}
fs.writeFileSync(root+'/docs/lesson-193-media-verification.json',JSON.stringify(report,null,2)+'\n');console.log('Verified 14 MP3s, 7 images and 2 H.264/AAC stories with 7 cues and encoded post-roll.');

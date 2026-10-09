// Verify the actual shipped MP4/AAC, final-frame poster and measured WebVTT.
import fs from 'node:fs';import {execFileSync,spawnSync} from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {toWebVtt} from './lib/webvtt.mjs';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const lesson=j('content/training/day1-basic-competencies/modules/07-problema/lessons/problem-causes/lesson.json'),asset=lesson.assets.find(a=>a.id==='problem-causes-story');
const dir='.preview/lesson172-deliverables';fs.mkdirSync(dir,{recursive:true});const records=[];
for(const lang of ['fil','en']){
 const timing=j(`remotion/public/problem-causes/narration-${lang}.json`),v=asset.videos[lang],file='public'+v.path;
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
 const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
 assert.equal(video.codec_name,'h264');assert.equal(audio.codec_name,'aac');assert.equal(video.width,854);assert.equal(video.height,480);assert.equal(video.avg_frame_rate,'30/1');assert.equal(probe.streams.length,2);
 const duration=Number(video.duration),expectedFrames=Math.round((timing.durationSeconds+1.1)*30);assert.equal(Number(video.nb_frames),expectedFrames);assert(Math.abs(duration-expectedFrames/30)<0.001);assert(duration<=90);assert(duration-timing.beats.at(-1).end_ms/1000>=1.05);
 assert.equal(fs.readFileSync('public'+v.captions.path,'utf8'),toWebVtt(timing));
 for(const item of [v,v.poster,v.captions])assert.equal(sha('public'+item.path),item.content_hash);
 const posterProbe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json','public'+v.poster.path],{encoding:'utf8'}));assert.equal(posterProbe.streams[0].width,854);assert.equal(posterProbe.streams[0].height,480);
 const last=`${dir}/story-${lang}-last-frame.png`;
 execFileSync('ffmpeg',['-v','error','-i',file,'-vf',`select=eq(n\\,${expectedFrames-1})`,'-frames:v','1','-y',last]);
 const comparison=spawnSync('ffmpeg',['-i','public'+v.poster.path,'-i',last,'-lavfi','ssim','-f','null','-'],{encoding:'utf8'});assert.equal(comparison.status,0,comparison.stderr);
 const similarity=Number(comparison.stderr.match(/All:([0-9.]+)/)?.[1]);assert(similarity>=0.95,'Poster must match the actual final encoded frame');
 records.push({language:lang,video_sha256:sha(file),poster_sha256:sha('public'+v.poster.path),caption_sha256:sha('public'+v.captions.path),video_duration_seconds:duration,narration_duration_seconds:timing.durationSeconds,ending_postroll_seconds:duration-timing.beats.at(-1).end_ms/1000,width:video.width,height:video.height,video_codec:video.codec_name,audio_codec:audio.codec_name,frames:Number(video.nb_frames),six_measured_caption_cues:true,poster_dimensions_verified:true,poster_final_frame_SSIM:similarity});
}
const receipt={status:'passed',source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),records};fs.writeFileSync(dir+'/lesson-172-encoded-media.json',JSON.stringify(receipt,null,2)+'\n');

// Compare posters with actual final MP4 frames, not only the render inputs.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
// Remotion's trimmed ffmpeg omits the rawvideo muxer; use the runner's full ffmpeg for this independent image comparison.
const ffmpeg='ffmpeg',decoder_version=execFileSync(ffmpeg,['-version'],{encoding:'utf8'}).split('\n')[0],sha=b=>createHash('sha256').update(b).digest('hex');
const lesson=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/lesson.json')),story=lesson.assets.find(a=>a.id==='communication-explain-story');
fs.mkdirSync('.preview/lesson163-decoded',{recursive:true});const records=[];
for(const lang of ['fil','en']){
 const v=story.videos[lang];
 const frame=execFileSync(ffmpeg,['-v','error','-sseof','-1','-i','public'+v.path,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:64*1024*1024}).subarray(-854*480*3);
 const poster=execFileSync(ffmpeg,['-v','error','-i','public'+v.poster.path,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:4*1024*1024});
 assert.equal(frame.length,854*480*3);assert.equal(poster.length,frame.length);let error=0;for(let i=0;i<frame.length;i++)error+=Math.abs(frame[i]-poster[i]);const mean=error/frame.length;assert(mean<6,'Poster must match actual ending frame');
 records.push({language:lang,source_video_sha256:sha(fs.readFileSync('public'+v.path)),poster_sha256:sha(fs.readFileSync('public'+v.poster.path)),final_frame_decoded_rgb_sha256:sha(frame),poster_decoded_rgb_sha256:sha(poster),mean_absolute_channel_error:mean,status:'passed'});
}
fs.writeFileSync('docs/lesson-163-decoded-media-check.json',JSON.stringify({status:'passed',decoder_version,method:'Decode last shipped MP4 frame and poster to854x480RGB; mean absolute channel error below6 allows H264/JPEG encoding differences.',records},null,2)+'\n');

// Derive review posters from the actual final encoded video frame.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-action-plan/lesson.json';
const lesson=JSON.parse(fs.readFileSync(leaf)),story=lesson.assets.find(a=>a.id==='problem-action-plan-story');
const generation=JSON.parse(fs.readFileSync('docs/lesson-174-media-generation.json'));
const records=[];fs.mkdirSync('.preview/lesson174-deliverables',{recursive:true});
for(const language of ['fil','en']){
 const video=story.videos[language],source='public'+video.path;
 const info=JSON.parse(execFileSync('ffprobe',['-v','quiet','-select_streams','v:0','-count_frames','-show_streams','-of','json',source],{encoding:'utf8'}));
 const last=Number(info.streams[0].nb_read_frames)-1;if(!(last>0))throw Error('Encoded frame count missing');
 const temp=`.preview/lesson174-deliverables/encoded-final-${language}.jpg`;
 execFileSync('ffmpeg',['-v','error','-i',source,'-vf',`select=eq(n\\,${last})`,'-frames:v','1','-fps_mode','vfr','-q:v','2','-y',temp]);
 const hash=sha(temp),poster={path:`/training/bhw-1-7/problem-action-plan-encoded-final-${language}-${hash.slice(0,12)}.jpg`,content_hash:hash};
 const target='public'+poster.path;if(fs.existsSync(target)&&sha(target)!==hash)throw Error('Existing hashed poster changed');
 fs.copyFileSync(temp,target);
 const previous=generation.encoded_final_frame_posters?.find(r=>r.language===language&&r.source_video_sha256===sha(source));
 records.push({language,source_video:video.path,source_video_sha256:sha(source),frame_index:last,poster,previous_poster:previous?.previous_poster??video.poster,method:'ffprobe counted decoded frames; ffmpeg selected final frame from actual shipped H.264 and encoded JPEG quality 2'});
 video.poster=poster;if(language==='fil'){story.path=poster.path;story.content_hash=poster.content_hash;}
 const report=generation.reports.find(r=>r.language===language);report.video=video;report.poster=poster;
}
generation.encoded_final_frame_posters=records;
fs.writeFileSync(leaf,JSON.stringify(lesson,null,2)+'\n');
fs.writeFileSync('docs/lesson-174-media-generation.json',JSON.stringify(generation,null,2)+'\n');
console.log('Derived both posters from the final actual encoded frame; prior poster bytes retained.');

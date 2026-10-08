// Decode the actual selected media; acoustic measurements are not human listening.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(import.meta.url);
const {getExecutablePath}=require(path.join(path.dirname(require.resolve('@remotion/renderer',{paths:[root+'/remotion']})),'compositor/get-executable-path.js'));
const ffmpeg=getExecutablePath({indent:false,logLevel:'error',type:'ffmpeg',binariesDirectory:null});
const sha=b=>createHash('sha256').update(b).digest('hex'),j=p=>JSON.parse(fs.readFileSync(root+'/'+p));
const manifest=j('content/training/day1-basic-competencies/narration.json'),lesson=j('content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-self-management/lesson.json');
const records=[];
const selected=[];
for(const [id,langs]of Object.entries(manifest.lessons['bhw-self-management'].sections))for(const [language,track]of Object.entries(langs))selected.push({id:'read-'+id+'-'+language,language,path:track.src,declared_sha256:track.sha256});
const story=lesson.assets.find(a=>a.id===lesson.featured_asset_id);if(!story?.videos)throw Error('Selected story videos required');
for(const [language,video]of Object.entries(story.videos))selected.push({id:'story-'+language,language,path:video.path,declared_sha256:video.content_hash});
for(const selectedMedia of selected){
 const file=root+'/public'+selectedMedia.path,bytes=fs.readFileSync(file);
 if(sha(bytes)!==selectedMedia.declared_sha256)throw Error('Selected media hash mismatch: '+selectedMedia.path);
 const wav=execFileSync(ffmpeg,['-v','error','-i',file,'-vn','-ac','1','-ar','24000','-c:a','pcm_s16le','-f','wav','pipe:1'],{maxBuffer:16*1024*1024});
 let dataOffset=-1;for(let offset=12;offset+8<=wav.length;){const size=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data'){dataOffset=offset+8;break;}offset+=8+size+(size%2);}if(dataOffset<0)throw Error('Decoded WAV lacks PCM data');const pcm=wav.subarray(dataOffset);
 const count=pcm.length/2;let squared=0,peak=0,clipped=0,first=-1,last=-1;
 for(let i=0;i<count;i++){const v=Math.abs(pcm.readInt16LE(i*2)/32768);squared+=v*v;peak=Math.max(peak,v);if(v>.999)clipped++;if(v>.003){if(first<0)first=i;last=i;}}
 records.push({...selectedMedia,decoded_samples:count,decoded_seconds:count/24000,rms:Math.sqrt(squared/count),peak,clipped_sample_ratio:clipped/count,first_active_ms:first/24,tail_after_last_active_ms:last<0?null:(count-last-1)/24});
}
const report={date:new Date().toISOString(),method:'PCM decoded from fourteen selected Read MP3s and both shipped MP4 AAC tracks; activity threshold 0.003. Machine measurements do not establish human approval.',records};
report.status=records.length===16&&records.every(r=>r.decoded_samples>0&&r.rms>.002&&r.first_active_ms>=0)?'passed':'failed';
fs.writeFileSync(root+'/docs/lesson-155-audio-metrics.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,tracks:records.length,records}));if(report.status!=='passed')process.exitCode=1;

// Verify actual shipped bytes and exact raw model-review provenance, without approval.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const raw=fs.readdirSync('.preview/lesson183-raw').filter(p=>p.endsWith('.json')).map(p=>{
 const r=read('.preview/lesson183-raw/'+p);assert.equal(sha(JSON.stringify(r.request)),r.request_sha256);if(r.response_body!==null)assert.equal(sha(r.response_body),r.response_sha256);assert.equal(r.transport_headers,'omitted; no credentials recorded');return {...r,file:p};
});
const reviewed=[];
for(const kind of ['audio-review','story-audio-review']){
 const report=read('docs/lesson-183-'+kind+'.json');assert(['available_reviews_recorded','read_reviews_recorded'].includes(report.status));assert.equal(report.full_count,kind==='audio-review'?12:2);assert.equal(report.focused_count,kind==='audio-review'?48:8);
 for(const record of report.records){
  if(record.source_video)assert.equal(sha(fs.readFileSync('public'+record.source_video)),record.source_video_sha256);
  for(const r of [record.full,...record.excerpts]){
   assert.equal(r.status,'reviewed');const bytes=fs.readFileSync(r.file);assert.equal(sha(bytes),r.sha256);assert.equal(bytes.length,r.bytes);
   const requests=raw.filter(raw=>raw.response_status===200&&raw.request.model===report.model&&raw.request.input.some(i=>i.type==='text'&&sha(i.text)===report.prompt_sha256)&&raw.request.input.some(i=>i.type==='audio'&&sha(Buffer.from(i.data,'base64'))===r.sha256));
   assert(requests.length>0,'Missing exact raw reviewed audio: '+record.id);
   reviewed.push({id:record.id,kind:r===record.full?'full':r.kind,sha256:r.sha256,raw_files:requests.map(r=>r.file)});
  }
 }
}
assert.equal(reviewed.length,70);
const lesson=read('content/training/day1-basic-competencies/modules/08-osh/lessons/safety-prepare/lesson.json');
const videos=[];
for(const asset of lesson.assets){assert.equal(asset.review_status,'draft');assert.equal(sha(fs.readFileSync('public'+asset.path)),asset.content_hash);for(const [language,v]of Object.entries(asset.videos??{})){
 for(const media of [v,v.poster,v.captions])assert.equal(sha(fs.readFileSync('public'+media.path)),media.content_hash);
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json','public'+v.path],{encoding:'utf8'}));assert(probe.streams.some(s=>s.codec_name==='h264'&&s.width===854&&s.height===480));assert(probe.streams.some(s=>s.codec_name==='aac'));assert.equal(v.duration_s,Math.ceil(Number(probe.format.duration)));assert(v.duration_s<=90);
 assert.equal((fs.readFileSync('public'+v.captions.path,'utf8').match(/ --> /g)??[]).length,6);videos.push({language,path:v.path,sha256:v.content_hash,duration_s:Number(probe.format.duration)});
}}
assert.equal(videos.length,2);fs.mkdirSync('.preview/lesson183-deliverables',{recursive:true});
fs.writeFileSync('.preview/lesson183-deliverables/lesson-183-media-verification.json',JSON.stringify({status:'passed',source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),full_reviews:14,focused_reviews:56,raw_records:raw.length,reviewed,videos,human_listening:'pending',clinical_review:'pending',owner_approval:'pending'},null,2)+'\n');
console.log('Verified 14 full / 56 focused exact-byte reviews and both shipped stories.');

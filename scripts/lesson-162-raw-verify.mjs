// Match every selected model judgment to retained raw audio request/response bytes.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const sha=b=>createHash('sha256').update(b).digest('hex'),j=p=>JSON.parse(fs.readFileSync(p));
function files(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function text(v){if(typeof v==='string')return v;if(Array.isArray(v))return v.map(text).filter(Boolean).join('\n');if(!v||typeof v!=='object')return '';if(typeof v.output_text==='string')return v.output_text;if(v.type==='text'&&typeof v.text==='string')return v.text;return text(v.outputs??v.output??v.content??v.steps?.filter(s=>s.type==='model_output')??[]);}
const members=[],responses=[];
for(const file of [...files('.preview/lesson162-raw'),...files('.preview/lesson162-retained')]){
 const bytes=fs.readFileSync(file);members.push({file,bytes:bytes.length,sha256:sha(bytes)});
 if(!file.endsWith('.json'))continue;
 const raw=JSON.parse(bytes);if(!raw.request_sha256)continue;
 if(raw.transport_headers!=='omitted; no credentials recorded'||sha(JSON.stringify(raw.request))!==raw.request_sha256)throw Error('Raw request hash/credential policy mismatch: '+file);
 if(raw.response_body!==null&&sha(raw.response_body)!==raw.response_sha256)throw Error('Raw response hash mismatch: '+file);
 if(raw.response_status===200){const audio=raw.request?.input?.find(v=>v.type==='audio');if(audio)responses.push({file,audio_sha256:sha(Buffer.from(audio.data,'base64')),response:text(JSON.parse(raw.response_body)),request_sha256:raw.request_sha256,response_sha256:raw.response_sha256});}
}
const full=j('docs/lesson-162-audio-review.json'),focus=j('docs/lesson-162-audio-focus.json');
const expected=[...full.records.map(r=>({id:r.id,audio_sha256:r.sha256,response:r.model_response})),...focus.records.flatMap(r=>r.excerpts.map(e=>({id:r.id+'/'+e.kind,audio_sha256:e.excerpt_sha256,response:e.model_response})))];
if(expected.length!==70)throw Error('Expected fourteen full and fifty-six focused reviews');
const matched=expected.map(e=>{const raw=responses.find(r=>r.audio_sha256===e.audio_sha256&&r.response===e.response);if(!raw)throw Error('Raw exact request/response missing: '+e.id);return {id:e.id,...raw,response:undefined};});
const out='.preview/lesson162-deliverables';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/lesson-162-raw-evidence-verification.json',JSON.stringify({status:'passed',source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'Every selected model judgment matches the exact audio bytes in a raw request and verbatim response. Earlier raw archives have separate pinned ZIP digests/member receipts. Raw files are a separate Actions artifact; no credentials or learner data.',matched_reviews:matched,members},null,2)+'\n');
console.log('Verified seventy model judgments against retained raw requests and responses.');

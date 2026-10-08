// Build a new frozen review package only. Never overwrite an earlier package.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),deliver=root+'/.preview/lesson156-deliverables',stage=root+'/.preview/lesson156-package';
const sha=b=>createHash('sha256').update(b).digest('hex');
if(fs.existsSync(deliver+'/lesson-1.5.6-malou-review.zip'))throw Error('Frozen package already exists; do not overwrite');
fs.mkdirSync(stage,{recursive:true});
const copy=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);};
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const scoped=files.filter(p=>p.includes('/lessons/bhw-right-contact/')||p.includes('bhw-right-contact')||p.includes('lesson-156')||p==='content/training/day1-basic-competencies/narration.json'||p==='content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json'||p==='remotion/src/Root.tsx'||p==='scripts/lib/reference-narration.mjs'||p==='scripts/lib/tts-providers/gemini.mjs'||p==='src/components/elearning/reference-lessons.tsx'||p.startsWith('.github/workflows/')||p.startsWith('content/training/day1-basic-competencies/modules/05-bhw-at-barangay/')&&!p.includes('/lessons/'));
for(const p of scoped)copy(root+'/'+p,stage+'/source/'+p);
for(const p of ['public/training/bhw-1-5/malou-courtyard-f6b2d754af39.png','docs/lesson-152-source-audit.json','docs/lesson-151-owner-approval.json','docs/lesson-152-owner-approval.json'])copy(root+'/'+p,stage+'/evidence/prior-released/'+p);
const lesson=JSON.parse(fs.readFileSync(root+'/content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-right-contact/lesson.json'));
const mf=JSON.parse(fs.readFileSync(root+'/content/training/day1-basic-competencies/narration.json'));
const selected=new Set(Object.values(mf.lessons['bhw-right-contact'].sections).flatMap(l=>Object.values(l).map(t=>t.src)));
const scene=lesson.assets.find(a=>a.id==='malou-contact');selected.add(scene.path);const story=lesson.assets.find(a=>a.id===lesson.featured_asset_id);for(const v of Object.values(story.videos))for(const a of [v,v.poster,v.captions])selected.add(a.path);if(selected.size!==19)throw Error('Expected exactly nineteen selected assets');
for(const p of selected)copy(root+'/public'+p,stage+'/media'+p);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
for(const name of ['lesson156-sources','lesson156-raw','lesson156-excerpts','lesson156-decoded','lesson156-workflow-zips']){const p=root+'/.preview/'+name;if(fs.existsSync(p))for(const f of walk(p))copy(f,stage+'/evidence/'+name+'/'+path.relative(p,f));}
for(const f of walk(deliver))copy(f,stage+'/review/'+path.relative(deliver,f));
const rawIndex=[];
for(const f of walk(root+'/.preview/lesson156-raw')){const j=JSON.parse(fs.readFileSync(f));if(j.response_body&&sha(Buffer.from(j.response_body))!==j.response_sha256)throw Error('Raw response SHA mismatch');const audios=(j.request?.input??[]).filter(x=>x.type==='audio').map(x=>({mime_type:x.mime_type,sha256:sha(Buffer.from(x.data,'base64'))}));rawIndex.push({file:path.basename(f),raw_file_sha256:sha(fs.readFileSync(f)),request_sha256:j.request_sha256??sha(Buffer.from(JSON.stringify(j.request))),response_sha256:j.response_sha256??null,response_status:j.response_status,model:j.request?.model,audio_inputs:audios});}
const full=JSON.parse(fs.readFileSync(root+'/docs/lesson-156-audio-review.json')),focus=JSON.parse(fs.readFileSync(root+'/docs/lesson-156-audio-focus.json'));
const joins=[];for(const record of full.records){const raw=rawIndex.filter(r=>r.audio_inputs.some(a=>a.sha256===record.sha256)&&r.response_status===200);if(!raw.length)throw Error('Missing full raw audio join '+record.id);joins.push({id:record.id,audio_sha256:record.sha256,source_video_sha256:record.source_video_sha256??null,raw});}
for(const r of focus.records)for(const e of r.excerpts){const raw=rawIndex.filter(r=>r.audio_inputs.some(a=>a.sha256===e.excerpt_sha256)&&r.response_status===200);if(!raw.length)throw Error('Missing focused raw join '+r.id+' '+e.kind);joins.push({id:r.id+'-'+e.kind,audio_sha256:e.excerpt_sha256,raw});}
fs.writeFileSync(stage+'/evidence/raw-audio-sha-joins.json',JSON.stringify({raw_requests:rawIndex.length,full_records:full.records.length,focused_excerpts:focus.records.reduce((n,r)=>n+r.excerpts.length,0),joins},null,2)+'\n');
fs.writeFileSync(stage+'/README.txt','Lesson 1.5.6 complete bilingual DRAFT review. Open review/lesson-1.5.6-malou-review.html. All nineteen selected media are inline; original PDFs, raw model exchanges and SHA joins are evidence. Actual React components use disclosed local Next/save adapters. Model review is not human listening or owner/SME approval. Do not merge, deploy or publish before separate package approval.\n');
fs.writeFileSync(stage+'/member-sha256.json',JSON.stringify(Object.fromEntries(walk(stage).map(f=>[path.relative(stage,f),sha(fs.readFileSync(f))])),null,2)+'\n');
execFileSync('python',['-c',`import pathlib,zipfile,json,hashlib
p=pathlib.Path(${JSON.stringify(stage)});out=pathlib.Path(${JSON.stringify(deliver)})/'lesson-1.5.6-malou-review.zip'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted(p.rglob('*')):
  if f.is_file():z.write(f,f.relative_to(p).as_posix())
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(set(z.namelist()))
 assert all(not n.startswith('/') and '..' not in pathlib.PurePosixPath(n).parts for n in z.namelist())
 for n,h in json.loads(z.read('member-sha256.json')).items():assert hashlib.sha256(z.read(n)).hexdigest()==h
 html=z.read('review/lesson-1.5.6-malou-review.html');assert html==(pathlib.Path(${JSON.stringify(deliver)})/'lesson-1.5.6-malou-review.html').read_bytes()
 inline=json.loads(z.read('review/lesson-156-inline-media.json'))
 import re,base64
 embedded={hashlib.sha256(base64.b64decode(b)).hexdigest() for b in re.findall(rb'data:[a-zA-Z0-9/+.-]+;base64,([a-zA-Z0-9+/=]+)',html)}
 for n,j in inline.items():
  assert j['sha256'] in embedded
  assert hashlib.sha256(z.read('media'+n)).hexdigest()==j['sha256']
 receipt={'source_commit':${JSON.stringify(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim())},'status':'passed','zip_sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'zip_bytes':out.stat().st_size,'html_sha256':hashlib.sha256(html).hexdigest(),'html_bytes':len(html),'members':len(z.namelist()),'inline_media':len(inline),'selected_media':19,'member_hashes':{n:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist()},'checks':['CRC','unique safe paths','every indexed member SHA','HTML source equals ZIP bytes','every inline asset SHA equals source media']}
 (out.parent/'lesson-1.5.6-package-integrity.json').write_text(json.dumps(receipt,indent=2)+'\\n')
 print(json.dumps(receipt))
`],{cwd:root,stdio:'inherit'});

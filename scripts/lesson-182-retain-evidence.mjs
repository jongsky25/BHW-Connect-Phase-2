// Restore hash-pinned raw provider requests/responses and focused audio, never credentials.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const [receipt,initial] of [['docs/lesson-182-evidence-origins.json','read'],['docs/lesson-182-story-evidence-origins.json','story'],['docs/lesson-182-final-evidence-origins.json','final']]){
 const o=JSON.parse(fs.readFileSync(receipt));const archive='.preview/'+o.local_archive;fs.mkdirSync('.preview',{recursive:true});
 if(!fs.existsSync(archive)){
  if(!process.env.GH_TOKEN)throw Error('Read-only artifact token required');
  const response=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/artifacts/${o.artifact_id}/zip`,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'},redirect:'manual'});
  const location=response.headers.get('location');if(response.status!==302||!location||new URL(location).protocol!=='https:')throw Error('Pinned artifact redirect unavailable');const data=await fetch(location);if(!data.ok)throw Error('Pinned archive unavailable');const bytes=Buffer.from(await data.arrayBuffer());if(sha(bytes)!==o.archive_sha256)throw Error('Archive hash mismatch');fs.writeFileSync(archive,bytes);
 }
 if(sha(fs.readFileSync(archive))!==o.archive_sha256)throw Error('Retained archive hash mismatch');
 execFileSync('python3',['-c',String.raw`import pathlib,zipfile,sys,json,hashlib
archive,receipt,initial=sys.argv[1:];o=json.load(open(receipt));expected={m['path']:m for m in o['members']}
with zipfile.ZipFile(archive) as z:
 names=z.namelist();assert len(names)==len(set(names)) and z.testzip() is None
 for name in names:
  p=pathlib.PurePosixPath(name);assert not p.is_absolute() and '..' not in p.parts and chr(92) not in name
  if name.endswith('/'):continue
  b=z.read(name);assert hashlib.sha256(b).hexdigest()==expected[name]['sha256'] and len(b)==expected[name]['bytes']
  if not name.startswith(('.preview/lesson182-raw/','.preview/lesson182-excerpts/','remotion/public/safety-controls/shipped-aac-','remotion/public/safety-controls/narration-')):continue
  if initial=='story':
   if name.startswith('remotion/'):name='.preview/lesson182-initial-story-media/'+pathlib.PurePosixPath(name).name
   else:name=name.replace('.preview/lesson182-raw/','.preview/lesson182-initial-story-raw/').replace('.preview/lesson182-excerpts/','.preview/lesson182-initial-story-excerpts/')
  if initial=='read':name=name.replace('.preview/lesson182-raw/','.preview/lesson182-initial-raw/').replace('.preview/lesson182-excerpts/','.preview/lesson182-initial-excerpts/');
  output=pathlib.Path(name);output.parent.mkdir(parents=True,exist_ok=True)
  if output.exists():assert output.read_bytes()==b,'Retained evidence conflict '+name
  else:output.write_bytes(b)
`,archive,receipt,String(initial)],{stdio:'inherit'});
}

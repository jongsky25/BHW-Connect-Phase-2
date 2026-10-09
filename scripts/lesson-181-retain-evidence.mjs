// Restore only pinned build evidence, never credentials or mutable application state.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),sha=b=>createHash('sha256').update(b).digest('hex');
const origins=JSON.parse(fs.readFileSync(root+'/docs/lesson-181-evidence-origins.json','utf8'));
const initial=JSON.parse(fs.readFileSync(root+'/docs/lesson-181-initial-evidence-origins.json'));
for(const origin of [...initial.archives.map(o=>({...o,initial:true})),...origins.archives]){
 const archive=root+'/.preview/'+origin.local_archive;
 if(!fs.existsSync(archive)){
  if(!process.env.GH_TOKEN)throw Error('Read-only Actions token required for retained draft evidence');
  const response=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/artifacts/${origin.artifact_id}/zip`,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'},redirect:'manual'});
  if(response.status!==302)throw Error('Artifact redirect unavailable: '+response.status);
  const location=response.headers.get('location');if(!location||new URL(location).protocol!=='https:')throw Error('Invalid artifact redirect');
  const download=await fetch(location);if(!download.ok)throw Error('Pinned artifact unavailable: '+download.status);
  const bytes=Buffer.from(await download.arrayBuffer());if(sha(bytes)!==origin.zip_sha256)throw Error('Pinned generation evidence hash mismatch');
  fs.mkdirSync(path.dirname(archive),{recursive:true});fs.writeFileSync(archive,bytes);
 }
 if(sha(fs.readFileSync(archive))!==origin.zip_sha256)throw Error('Local retained evidence hash mismatch');
 execFileSync('python3',['-c',String.raw`
import pathlib,sys,zipfile
archive,root,initial=sys.argv[1:];root=pathlib.Path(root);initial=initial=='true'
with zipfile.ZipFile(archive) as z:
 names=z.namelist();assert len(names)==len(set(names)) and z.testzip() is None
 for name in names:
  p=pathlib.PurePosixPath(name);assert not p.is_absolute() and '..' not in p.parts and chr(92) not in name
  if name.endswith('/'):continue
  if not (name.startswith(('.preview/lesson181-raw/','.preview/lesson181-excerpts/')) or name.startswith('remotion/public/safety-identify/shipped-aac-') or name=='lesson-181-published-snapshot.json'):continue
  destination=name
  if initial:
   destination=name.replace('.preview/lesson181-excerpts/','.preview/lesson181-initial-excerpts/').replace('remotion/public/safety-identify/shipped-aac-','.preview/lesson181-initial-media/shipped-aac-')
   if name=='lesson-181-published-snapshot.json':destination='.preview/lesson181-initial-media/published-snapshot.json'
  output=root/destination;b=z.read(name);output.parent.mkdir(parents=True,exist_ok=True)
  if output.exists():assert output.read_bytes()==b,'Retained evidence conflict: '+name
  else:output.write_bytes(b)
assert list((root/'.preview/lesson181-raw').glob('*.json')),'Original requests/responses missing'
`,archive,root,String(Boolean(origin.initial))],{stdio:'inherit'});
}
console.log('Retained pinned raw requests/responses, actual focused excerpts, decoded AAC and bounded published snapshot.');

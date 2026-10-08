// Retain the exact initial and corrected provider responses in the draft package.
// Download only pinned GitHub Actions archives; never send the token to redirects.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const origins=JSON.parse(fs.readFileSync(root+'/docs/lesson-161-evidence-origins.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const origin of origins.archives){
 const archive=root+'/.preview/'+origin.local_archive;
 if(!fs.existsSync(archive)){
  if(!process.env.GH_TOKEN)throw Error('Read-only Actions token required for retained evidence');
  const response=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/artifacts/${origin.artifact_id}/zip`,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'},redirect:'manual'});
  if(response.status!==302)throw Error('Artifact redirect unavailable: '+response.status);
  const location=response.headers.get('location');if(!location||new URL(location).protocol!=='https:')throw Error('Invalid artifact redirect');
  const download=await fetch(location);if(!download.ok)throw Error('Artifact bytes unavailable: '+download.status);
  const bytes=Buffer.from(await download.arrayBuffer());if(sha(bytes)!==origin.zip_sha256)throw Error('Retained artifact hash mismatch');
  fs.mkdirSync(path.dirname(archive),{recursive:true});fs.writeFileSync(archive,bytes);
 }
 if(sha(fs.readFileSync(archive))!==origin.zip_sha256)throw Error('Local retained artifact hash mismatch');
 execFileSync('python3',['-c',String.raw`
import pathlib,sys,zipfile
archive,target,initial=sys.argv[1:];destination=pathlib.Path(target);destination.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(archive) as z:
 names=z.namelist();assert len(names)==len(set(names)) and z.testzip() is None
 for name in names:
  p=pathlib.PurePosixPath(name);assert not p.is_absolute() and '..' not in p.parts and chr(92) not in name
  if name.startswith('.preview/lesson161-raw/') and not name.endswith('/'):
   output=destination/p.name;b=z.read(name)
   if output.exists():assert output.read_bytes()==b
   else:output.write_bytes(b)
  if initial and name.startswith('.preview/lesson161-excerpts/') and not name.endswith('/'):
   output=pathlib.Path(initial).with_name('lesson161-initial-excerpts')/p.name;output.parent.mkdir(parents=True,exist_ok=True);b=z.read(name)
   if output.exists():assert output.read_bytes()==b
   else:output.write_bytes(b)
  if initial and name.startswith('remotion/public/communication-listen/') and p.suffix in ['.mp3','.json','.wav']:
   output=pathlib.Path(initial)/p.name;output.parent.mkdir(parents=True,exist_ok=True);b=z.read(name)
   if output.exists():assert output.read_bytes()==b
   else:output.write_bytes(b)
assert list(destination.glob('*.json')),'Original model responses missing'
`,archive,root+'/.preview/'+origin.response_directory,origin.stage==='initial'?root+'/.preview/lesson161-initial-media':''],{stdio:'inherit'});
 console.log('Retained hash-verified '+origin.stage+' model responses');
}

// Restore only hash-pinned evidence/media from our own completed generation run.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const pin='docs/lesson-163-evidence-cache.json';if(!fs.existsSync(pin)){console.log('Initial generation: no prior evidence cache.');process.exit(0);}
const p=JSON.parse(fs.readFileSync(pin));
if(!process.env.GH_TOKEN)throw Error('Read-only Actions token required');
const response=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/artifacts/${p.artifact_id}/zip`,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'}});
if(!response.ok)throw Error('Pinned artifact download HTTP '+response.status);
const bytes=Buffer.from(await response.arrayBuffer());if(createHash('sha256').update(bytes).digest('hex')!==p.archive_sha256)throw Error('Pinned evidence ZIP bytes differ');
fs.mkdirSync('.preview',{recursive:true});fs.writeFileSync('.preview/lesson163-cache.zip',bytes);
execFileSync('python3',['-c',String.raw`
import zipfile,pathlib
with zipfile.ZipFile('.preview/lesson163-cache.zip') as z:
 assert z.testzip() is None
 names=z.namelist();assert len(names)==len(set(names))
 for name in names:
  p=pathlib.PurePosixPath(name);assert not p.is_absolute() and '..' not in p.parts and chr(92) not in name
  if name.startswith(('.preview/lesson163-raw/','.preview/lesson163-excerpts/','.preview/lesson163-source/')) and not name.endswith('/'):
   target=pathlib.Path(name);data=z.read(name)
   if target.exists():assert target.read_bytes()==data,name
   else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
`],{stdio:'inherit'});
console.log('Restored byte-verified prior raw requests/responses, excerpts and source evidence.');

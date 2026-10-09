// Verify and retain earlier raw artifacts, including failed/superseded attempts.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const file='docs/lesson-162-evidence-origins.json';
if(fs.existsSync(file)){
 const origins=JSON.parse(fs.readFileSync(file));
 if(!Array.isArray(origins.runs)||origins.runs.length>8)throw Error('Unbounded evidence origin set');
 fs.mkdirSync('.preview/lesson162-downloads',{recursive:true});
 for(const origin of origins.runs){
  if(!Number.isSafeInteger(origin.run_id)||!Number.isSafeInteger(origin.artifact_id)||!/^[a-f0-9]{64}$/.test(origin.zip_sha256))throw Error('Invalid pinned evidence origin');
  const meta=JSON.parse(execFileSync('gh',['api',`repos/jongsky25/BHW-Connect-Phase-2/actions/artifacts/${origin.artifact_id}`],{encoding:'utf8'}));
  if(meta.name!=='lesson162-raw-audio-evidence'||meta.workflow_run.id!==origin.run_id||meta.expired||meta.digest!=='sha256:'+origin.zip_sha256)throw Error('Raw artifact metadata mismatch');
  const zip='.preview/lesson162-downloads/'+origin.artifact_id+'.zip',dir='.preview/lesson162-retained/'+origin.run_id;
  if(!process.env.GH_TOKEN)throw Error('Read-only artifact token required');
  const response=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/artifacts/${origin.artifact_id}/zip`,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'},redirect:'manual'});
  if(response.status!==302)throw Error('Pinned artifact redirect unavailable: '+response.status);
  const location=response.headers.get('location');if(!location||new URL(location).protocol!=='https:')throw Error('Invalid artifact redirect');
  // No authorization header is forwarded to the separate artifact host.
  const download=await fetch(location);if(!download.ok)throw Error('Pinned archive unavailable: '+download.status);
  fs.writeFileSync(zip,Buffer.from(await download.arrayBuffer()));
  if(createHash('sha256').update(fs.readFileSync(zip)).digest('hex')!==origin.zip_sha256)throw Error('Raw archive bytes mismatch');
  execFileSync('python3',['-c',String.raw`
import zipfile,pathlib,json,hashlib,sys
p=pathlib.Path(sys.argv[1]);dest=pathlib.Path(sys.argv[2]);dest.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(p) as z:
 names=z.namelist();assert len(names)==len(set(names)) and z.testzip() is None
 receipts=[]
 for item in z.infolist():
  name=item.filename;path=pathlib.PurePosixPath(name)
  assert not path.is_absolute() and '..' not in path.parts and chr(92) not in name
  assert not ((item.external_attr>>16)&0o170000)==0o120000
  if item.is_dir():continue
  b=z.read(item);target=dest/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b)
  receipts.append({'member':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
(dest/'integrity.json').write_text(json.dumps({'archive_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'safe_unique_members':True,'CRC_checks':True,'members':receipts},indent=2)+'\n')
`,zip,dir],{stdio:'inherit'});
  console.log('Retained verified raw evidence from run '+origin.run_id);
 }
}

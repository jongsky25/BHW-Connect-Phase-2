// Retrieve only explicitly hash-pinned draft raw evidence; no learner or release writes.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
if(!fs.existsSync('docs/lesson-172-evidence-origins.json'))process.exit(0);
const origin=JSON.parse(fs.readFileSync('docs/lesson-172-evidence-origins.json'));
for(const a of origin.raw_artifacts){
 if(!Number.isSafeInteger(a.artifact_id)||!/^([a-f0-9]{64})$/.test(a.sha256))throw Error('Invalid raw origin');
 const dir='.preview/lesson172-retained-raw/'+a.artifact_id;fs.mkdirSync(dir,{recursive:true});
 const zip=execFileSync('gh',['api',`repos/jongsky25/BHW-Connect-Phase-2/actions/artifacts/${a.artifact_id}/zip`],{maxBuffer:512*1024*1024});
 if(createHash('sha256').update(zip).digest('hex')!==a.sha256)throw Error('Raw archive hash changed');
 const file=dir+'/artifact.zip';fs.writeFileSync(file,zip);
 execFileSync('python3',['-c',`import zipfile,pathlib,sys,json,hashlib
p=pathlib.Path(sys.argv[1]);d=p.parent
with zipfile.ZipFile(p) as z:
 assert len(z.namelist())==len(set(z.namelist())) and z.testzip() is None
 for n in z.namelist():
  assert not n.startswith('/') and '..' not in pathlib.PurePosixPath(n).parts and chr(92) not in n
 z.extractall(d)
# A complete earlier export can contain a hash-pinned raw archive. Verify and
# extract its records instead of embedding another ZIP plus duplicate inputs.
for nested in d.rglob('lesson172-raw-evidence.zip'):
 receipt=json.loads((nested.parent/'lesson-172-raw-evidence-integrity.json').read_text())
 assert hashlib.sha256(nested.read_bytes()).hexdigest()==receipt['sha256']
 with zipfile.ZipFile(nested) as z:
  assert len(z.namelist())==len(set(z.namelist())) and z.testzip() is None
  for n in z.namelist():
   assert not n.startswith('/') and '..' not in pathlib.PurePosixPath(n).parts and chr(92) not in n
  for record in receipt['files']:
   content=z.read(record['member'])
   assert len(content)==record['bytes'] and hashlib.sha256(content).hexdigest()==record['sha256']
  z.extractall(nested.parent/'verified-records')
 nested.unlink()
p.unlink()`,file],{stdio:'inherit'});
}
// Restore the current reviewed excerpts from immutable, hash-pinned origins.
// Keep every original/superseded record in its artifact directory.
if(fs.existsSync('docs/lesson-172-audio-focus.json'))execFileSync('python3',['-c',`import pathlib,json,hashlib,shutil
root=pathlib.Path('.preview/lesson172-retained-raw');out=pathlib.Path('.preview/lesson172-excerpts');out.mkdir(parents=True,exist_ok=True)
focus=json.loads(pathlib.Path('docs/lesson-172-audio-focus.json').read_text())
for record in focus['records']:
 for excerpt in record['excerpts']:
  name=excerpt['file'];assert pathlib.PurePosixPath(name).name==name and chr(92) not in name
  expected=excerpt['excerpt_sha256'];target=out/name
  if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==expected:continue
  candidates=[p for p in root.rglob(name) if p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==expected]
  assert candidates,'Reviewed excerpt missing from pinned evidence: '+name
  shutil.copyfile(candidates[0],target)
  assert hashlib.sha256(target.read_bytes()).hexdigest()==expected
print('Restored exact reviewed WAV excerpts; original evidence retained.')`],{stdio:'inherit'});

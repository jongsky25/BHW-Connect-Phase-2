"""Restore only private evidence from immutable Actions archives, checking SHA-256."""
from pathlib import Path,PurePosixPath
import json,zipfile,hashlib,subprocess
root=Path(__file__).resolve().parent.parent
receipt=json.loads((root/'docs/lesson-183-evidence-origins.json').read_text())
for origin in receipt['artifacts']:
 p=root/'.preview'/('origin-'+str(origin['artifact_id'])+'.zip');p.parent.mkdir(exist_ok=True)
 with p.open('wb') as out:
  subprocess.run(['gh','api',f"repos/jongsky25/BHW-Connect-Phase-2/actions/artifacts/{origin['artifact_id']}/zip"],stdout=out,check=True)
 assert hashlib.sha256(p.read_bytes()).hexdigest()==origin['sha256'],'Origin archive hash mismatch'
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  for name in z.namelist():
   path=PurePosixPath(name);assert not path.is_absolute() and '..' not in path.parts
   if name.endswith('/'):continue
   if not name.startswith(('.preview/lesson183-raw/','.preview/lesson183-audio/')) and name!='lesson-183-published-snapshot.json':continue
   dst=root/name;data=z.read(name)
   if dst.exists():assert dst.read_bytes()==data,'Evidence collision: '+name
   else:dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(data)
 print('Restored exact evidence origin',origin['artifact_id'])
 if origin['run_id']==37905091757:
  dst=root/'.preview/lesson183-deliverables/failed-story-build.log';dst.parent.mkdir(parents=True,exist_ok=True)
  with dst.open('wb') as out:subprocess.run(['gh','run','view',str(origin['run_id']),'--log-failed'],stdout=out,check=True)

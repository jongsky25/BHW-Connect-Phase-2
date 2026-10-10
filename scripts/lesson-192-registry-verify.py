"""Enumerate the current registry and verify every composition rendered at this head.
Use --wait in the review workflow; an unrelated or skipped run never counts.
"""
import pathlib,json,subprocess,os,re,time,sys,hashlib,datetime
root=pathlib.Path(__file__).resolve().parent.parent
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
browser=os.environ.get('PLAYWRIGHT_EXECUTABLE_PATH') or subprocess.check_output(['node','--input-type=module','-e',"import {chromium} from '@playwright/test';process.stdout.write(chromium.executablePath())"],cwd=root,text=True)
output=subprocess.check_output(['npx','remotion','compositions','--quiet','--browser-executable='+browser],cwd=root/'remotion',text=True,stderr=subprocess.STDOUT)
ids=output.strip().splitlines()[-1].split()
assert ids and all(re.fullmatch('[A-Za-z0-9-]+',i) for i in ids)
assert len(ids)==len(set(ids)) and ids[-2:]==['ResourcesSafeChangeStoryFil','ResourcesSafeChangeStoryEn']
report={'status':'actual current registry enumerated; complete render pending','source_commit':head,'root_sha256':hashlib.sha256((root/'remotion/src/Root.tsx').read_bytes()).hexdigest(),'registry_count':len(ids),'preserved_predecessor_count':len(ids)-2,'ids_in_order':ids,'target_additions':ids[-2:],'preservation_receipt':'lesson-192-preservation.json'}
p=root/'docs/lesson-192-registry.json'
def save():p.write_text(json.dumps(report,indent=2)+'\n')
save()
if '--enumerate-only' in sys.argv:
 print('Enumerated',len(ids),'compositions with exactly two target additions.');sys.exit(0)
deadline=time.monotonic()+30*60
while True:
 runs=json.loads(subprocess.check_output(['gh','run','list','--workflow','remotion.yml','--commit',head,'--limit','10','--json','databaseId,status,conclusion'],cwd=root,text=True))
 run=next((r for r in runs if r['status']=='completed'),None)
 if run:
  assert run['conclusion']=='success',run
  break
 assert '--wait' in sys.argv and time.monotonic()<deadline,'Complete registry render unavailable at this head'
 print('Waiting for complete registry render at',head,flush=True);time.sleep(30)
run_id=run['databaseId']
jobs=json.loads(subprocess.check_output(['gh','run','view',str(run_id),'--json','jobs'],cwd=root,text=True))['jobs']
rendered_jobs=[j for j in jobs if any(s['name']=='Render every composition' and s['conclusion']=='success' for s in j['steps'])]
assert len(rendered_jobs)==8 and all(j['conclusion']=='success'for j in jobs),'Skipped/incomplete render shard'
log=subprocess.check_output(['gh','run','view',str(run_id),'--log'],cwd=root,text=True)
rendered=re.findall(r'video\s+[^\n]*?/remotion/out/([A-Za-z0-9-]+)\.mp4\s+\(',log)
assert len(rendered)==len(set(rendered))==len(ids) and set(rendered)==set(ids),(len(rendered),len(ids))
report.update(status='every composition in the actual current registry rendered successfully',run_id=run_id,run_url=f'https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/{run_id}',successful_shards=8,rendered_compositions=len(rendered),verified_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),log_sha256=hashlib.sha256(log.encode()).hexdigest())
save();print('Verified all',len(ids),'compositions across eight successful render shards.')

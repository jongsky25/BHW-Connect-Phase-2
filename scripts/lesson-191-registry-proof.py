"""Exact-head proof of the runtime-enumerated registry and all eight render shards."""
import pathlib,json,hashlib,subprocess,sys,time,re
root=pathlib.Path('.');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
def gh(*args):return json.loads(subprocess.check_output(['gh',*args],text=True))
def inputs():
 names=subprocess.check_output(['git','ls-files','remotion','scripts/remotion-render.mjs'],text=True).splitlines()
 return {p:sha(root/p) for p in names if (root/p).is_file()}
if len(sys.argv)>1:
 shard=int(sys.argv[1]);ids=pathlib.Path(sys.argv[2]).read_text().split();assert ids and len(set(ids))==len(ids)
 records=[]
 for i,id in enumerate(ids):
  if i%8!=shard:continue
  paths=[root/'remotion/out'/f'{id}.mp4',root/'remotion/out'/f'{id}-poster.jpg']
  assert all(p.exists() and p.stat().st_size>0 for p in paths),id
  records.append({'id':id,'files':[{'name':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in paths]})
 report={'source_commit':head,'runtime_registry':ids,'inputs':inputs(),'shard':shard,'renders':records}
 (root/'remotion/out'/f'lesson-191-registry-shard-{shard}.json').write_text(json.dumps(report,indent=2)+'\n')
else:
 deadline=time.monotonic()+1800;run=None
 while time.monotonic()<deadline:
  runs=gh('run','list','--workflow','remotion.yml','--commit',head,'--limit','10','--json','databaseId,status,conclusion,headSha')
  if runs:
   run=runs[0]
   if run['status']=='completed':break
  print('Awaiting complete exact-head registry render',flush=True);time.sleep(20)
 assert run and run['status']=='completed' and run['conclusion']=='success',run
 details=gh('run','view',str(run['databaseId']),'--json','jobs,url')
 assert len(details['jobs'])==8
 for job in details['jobs']:
  assert job['conclusion']=='success'
  step=next(s for s in job['steps'] if s['name']=='Render every composition');assert step['conclusion']=='success'
 dest=root/'.preview/lesson191-registry';dest.mkdir(parents=True,exist_ok=True)
 # Download official run artifacts; retain all output hashes in proof but only receipts in the review ZIP.
 subprocess.check_call(['gh','run','download',str(run['databaseId']),'--pattern','remotion-renders-*','--dir',str(dest)])
 receipts=[json.loads(p.read_text()) for p in dest.glob('*/lesson-191-registry-shard-*.json')];assert len(receipts)==8
 ids=receipts[0]['runtime_registry'];expected=inputs();rendered=[]
 for r in receipts:
  assert r['source_commit']==head and r['runtime_registry']==ids and r['inputs']==expected
  assert [v['id'] for v in r['renders']]==ids[r['shard']::8]
  for record in r['renders']:
   rendered.append(record['id'])
   for f in record['files']:
    p=dest/f"remotion-renders-{r['shard']}"/f['name'];assert p.stat().st_size==f['bytes'] and sha(p)==f['sha256']
 assert len(rendered)==len(ids) and set(rendered)==set(ids)
 assert ids[-2:]==['ResourcesAuditStoryFil','ResourcesAuditStoryEn']
 report={'status':'all runtime-enumerated compositions rendered and exact artifact bytes verified','source_commit':head,'run_id':run['databaseId'],'url':details['url'],'actual_registry_count':len(ids),'runtime_registry':ids,'shards':receipts,'human_approval':False}
 (root/'docs/lesson-191-registry-verification.json').write_text(json.dumps(report,indent=2)+'\n')
 print('Verified every actual registry composition:',len(ids))

 # Capture standard CI separately: retain its inherited failure, never report it as green.
 ci_runs=gh('run','list','--workflow','ci.yml','--commit',head,'--limit','10','--json','databaseId,status,conclusion,headSha');assert ci_runs
 ci=ci_runs[0]
 while ci['status']!='completed' and time.monotonic()<deadline:
  time.sleep(20);ci=gh('run','view',str(ci['databaseId']),'--json','databaseId,status,conclusion,headSha')
 assert ci['status']=='completed'
 ci_details=gh('run','view',str(ci['databaseId']),'--json','jobs,url')
 jobs={j['name']:j for j in ci_details['jobs']};assert jobs['e2e']['conclusion']=='success'
 checks=jobs['checks'];steps={s['name']:s['conclusion'] for s in checks['steps']}
 assert steps['Lint']=='success' and steps['Typecheck']=='success'
 assert steps['Unit tests']=='failure' and checks['conclusion']=='failure'
 log=subprocess.check_output(['gh','run','view',str(ci['databaseId']),'--job',str(checks['databaseId']),'--log'],text=True)
 log=re.sub(r'\x1b\[[0-9;]*m','',log)
 failures=re.findall(r'FAIL\s+(scripts/tests/[^\s]+)\s+>\s+([^\n]+)',log)
 assert len(failures)==1 and failures[0][0]=='scripts/tests/reference-narration.test.mjs',failures
 start=log.index('FAIL  scripts/tests/reference-narration.test.mjs') if 'FAIL  scripts/tests/reference-narration.test.mjs' in log else log.index('FAIL scripts/tests/reference-narration.test.mjs')
 trace=log[start:];actual=sorted(set(re.findall(r'([a-z0-9-]+/[a-z0-9-]+/(?:fil|en))',trace)))
 expected=sorted('problem-prioritize/'+section+'/'+language for section in ['criteria','worked-scores','score-evidence','tie-and-urgent-care','practice','check'] for language in ['fil','en'])
 assert actual==expected,actual
 out=root/'.preview/lesson191-deliverables';out.mkdir(parents=True,exist_ok=True)
 (out/'lesson-191-unit-failure.log').write_text(trace)
 check_report={'source_commit':head,'ci_head_sha':ci['headSha'],'run_id':ci['databaseId'],'url':ci_details['url'],'ci_conclusion':ci['conclusion'],'lint':'passed','typecheck':'passed','disposable_local_supabase_e2e':'passed','unit_tests':'one inherited failure retained; suite not green','failure':{'file':failures[0][0],'test':failures[0][1].strip(),'stale_tracks':actual},'no_exclusions_or_unrelated_regeneration':True,'checks':steps}
 (root/'docs/lesson-191-check-verification.json').write_text(json.dumps(check_report,indent=2)+'\n')
 print('Verified lint, types and disposable E2E; retained the single inherited twelve-track narration failure.')

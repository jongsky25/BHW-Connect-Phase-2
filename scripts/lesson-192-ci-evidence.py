"""Record exact-head normal CI; keep the known global freshness failure visible."""
import pathlib,json,subprocess,time,re,datetime
root=pathlib.Path(__file__).resolve().parent.parent
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
deadline=time.monotonic()+20*60
while True:
 runs=json.loads(subprocess.check_output(['gh','run','list','--workflow','ci.yml','--commit',head,'--limit','10','--json','databaseId,status,conclusion'],cwd=root,text=True))
 run=next((r for r in runs if r['status']=='completed'),None)
 if run:break
 assert time.monotonic()<deadline,'Exact-head CI did not finish'
 print('Waiting for exact-head CI',head,flush=True);time.sleep(30)
run_id=run['databaseId'];jobs=json.loads(subprocess.check_output(['gh','run','view',str(run_id),'--json','jobs'],cwd=root,text=True))['jobs']
e2e=next(j for j in jobs if j['name']=='e2e');checks=next(j for j in jobs if j['name']=='checks')
assert e2e['conclusion']=='success','Disposable Supabase E2E failed'
for name in ['Lint','Typecheck']:assert next(s for s in checks['steps']if s['name']==name)['conclusion']=='success',name
try:
 log=subprocess.check_output(['gh','api',f"repos/jongsky25/BHW-Connect-Phase-2/actions/jobs/{checks['databaseId']}/logs"],cwd=root,text=True,stderr=subprocess.PIPE)
except subprocess.CalledProcessError:
 log=subprocess.check_output(['gh','run','view',str(run_id),'--log'],cwd=root,text=True)
clean=re.sub(r'\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])','',log).replace('\u200b','')
failures=re.findall(r'\bFAIL\s+([^\n]+)',clean)
assert len(failures)==1 and 'scripts/tests/reference-narration.test.mjs' in failures[0] and 'committed narration is current for every converted subchapter' in failures[0],failures
# GitHub may split styled summary fragments across timestamped log lines.
# Parse numeric failed/passed fields in the summary window, including commas.
summaries=[]
for match in re.finditer(r'\bTests\b',clean):
 window=clean[match.start():match.start()+700]
 failed=re.search(r'(\d+)\s+failed',window)
 passed_match=re.search(r'(\d[\d,]*)\s+passed',window)
 if failed and passed_match:summaries.append((int(failed.group(1)),int(passed_match.group(1).replace(',',''))))
assert summaries and summaries[-1][0]==1, ('Unexpected full-suite totals', [line for line in clean.splitlines() if 'Tests' in line][-5:])
passed=summaries[-1][1]
known=[f'problem-prioritize/{s}/{l}'for s in ['criteria','worked-scores','score-evidence','tie-and-urgent-care','practice','check']for l in ['fil','en']]
for key in known:assert key in clean,key
assert not re.search(r'\+\s+[\'\"]resources-safe-change/',clean),'Target narration stale'
report={'source_commit':head,'run_id':run_id,'run_url':f'https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/{run_id}','lint':'passed; three existing warnings','typecheck':'passed','unit_tests':{'passed':passed,'failed':1,'failing_check':failures[0],'known_stale_tracks':known},'disposable_local_supabase_e2e':'passed','fully_green':False,'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(root/'docs/lesson-192-ci-evidence.json').write_text(json.dumps(report,indent=2)+'\n')
print('Exact-head lint/typecheck/E2E passed; unit suite retains exactly its one known 12-track freshness failure.')

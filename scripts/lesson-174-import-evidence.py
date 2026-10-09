"""Import hash-pinned target evidence, preserving integrated main and old media."""
import pathlib, json, hashlib, zipfile, subprocess, sys
root=pathlib.Path('.')
archive=pathlib.Path(sys.argv[1]); expected=sys.argv[2]
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(archive.read_bytes())==expected
allowed=['public/training/audio/07-problema/problem-action-plan/','public/training/bhw-1-7/','remotion/public/problem-action-plan/','remotion/out/problem-action-plan-','.preview/lesson174-raw/','.preview/lesson174-excerpts/','content/training/day1-basic-competencies/modules/07-problema/lessons/problem-action-plan/']
named={'docs/lesson-174-media-generation.json','docs/lesson-174-audio-review.json','docs/lesson-174-audio-focus.json','lesson-174-published-snapshot.json'}
narration='content/training/day1-basic-competencies/narration.json'
report={'zip_sha256':expected,'safe_unique_members':True,'CRC':True,'imported':[]}
with zipfile.ZipFile(archive) as z:
 names=z.namelist(); assert len(names)==len(set(names)) and z.testzip() is None
 for name in names:
  p=pathlib.PurePosixPath(name); assert not p.is_absolute() and '..' not in p.parts and '\\' not in name
  assert name==narration or name in named or any(name.startswith(prefix) for prefix in allowed),name
 # Validate remote sibling selections against the exact synthesis commit.
 remote=json.loads(z.read(narration)); prior=json.loads(subprocess.check_output(['git','show','a3728aade772d8b074cba5abd1391365963b691f:'+narration]))
 for key,value in prior['lessons'].items():
  if key!='problem-action-plan': assert remote['lessons'][key]==value,key
 for key,value in prior.get('history',{}).items():
  assert (remote['history'][key][:len(value)] if key=='problem-action-plan' else remote['history'][key])==value,key
 current=json.loads((root/narration).read_bytes())
 current['lessons']['problem-action-plan']=remote['lessons']['problem-action-plan']
 current['history']['problem-action-plan']=remote['history']['problem-action-plan']
 for name in names:
  if name==narration:continue
  b=z.read(name);p=root/name
  if p.exists() and name.startswith(('public/','remotion/public/','.preview/')):assert p.read_bytes()==b,'Existing evidence/media differs: '+name
  p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
  report['imported'].append({'file':name,'bytes':len(b),'sha256':sha(b)})
 (root/narration).write_text(json.dumps(current,ensure_ascii=False,indent=2)+'\n')
# Node uses literal Unicode JSON; compare through the exact predecessor hash guard.
(root/'docs/lesson-174-import-receipt.json').write_text(json.dumps(report,indent=2)+'\n')
print('Imported target evidence and retained integrated sibling selections:',len(report['imported']))

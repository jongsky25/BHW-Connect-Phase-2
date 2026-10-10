"""Exact media/ZIP integrity for the bilingual review draft; no release approval."""
import pathlib,json,hashlib,zipfile,base64,subprocess
root=pathlib.Path('.');out=root/'.preview/lesson193-deliverables';html=out/'lesson-1.9.3-charlaine-review.html';assert html.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
receipts=json.loads((out/'lesson-193-inline-media.json').read_text());text=html.read_text()
for p,v in receipts.items():
 b=(root/'public'/p.lstrip('/')).read_bytes();assert len(b)==v['bytes'] and sha(b)==v['sha256'] and base64.b64encode(b).decode() in text,p
manifest=json.loads((root/'content/training/day1-basic-competencies/narration.json').read_text())
full=json.loads((root/'docs/lesson-193-audio-review.json').read_text());focus=json.loads((root/'docs/lesson-193-audio-focus.json').read_text())
assert len(full['records'])==16 and len(focus['records'])==16
for record in full['records']:
 if record['id'].startswith('story-'):
  media=root/f"remotion/public/resources-monitor/shipped-aac-{record['language']}.wav"
  assert sha((root/'public'/record['source_video'].lstrip('/')).read_bytes())==record['source_video_sha256']
 else:
  section,language=record['id'].removeprefix('read-resources-monitor-').rsplit('-',1)
  media=root/'public'/manifest['lessons']['resources-monitor']['sections'][section][language]['src'].lstrip('/')
 assert sha(media.read_bytes())==record['sha256'],record['id']
assert sum(len(r['excerpts']) for r in focus['records'])==64
assert all(r.get('model_response') and not r['model_response'].startswith('Review unavailable') for r in full['records'])
assert all(e.get('model_response') and not e.get('review_failure') for r in focus['records'] for e in r['excerpts'])
for record in focus['records']:
 assert sha((root/'public'/record['source_path'].lstrip('/')).read_bytes())==record['source_sha256']
 for excerpt in record['excerpts']:
  assert sha((root/'.preview/lesson193-excerpts'/excerpt['file']).read_bytes())==excerpt['excerpt_sha256']
paths=set()
for pattern in ['docs/lesson-193-*','docs/lesson-19-charlaine-*','scripts/lesson-193-*','scripts/remotion-resources-monitor-narrate.mjs','scripts/lib/lesson-193-integration.mjs','scripts/tests/lesson-193.test.mjs','.github/workflows/lesson193-*.yml','content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/*','public/training/audio/09-sustainable-practices/resources-monitor/*','public/training/bhw-1-9/charlaine-monitor-*','public/training/bhw-1-9/charlaine-reference-*','public/training/bhw-1-9/resources-monitor-*','public/training/module-1-9/monitor-c5d2eff5ad98.svg','remotion/src/resources-monitor/*','remotion/public/resources-monitor/*','.preview/lesson193-source/*.txt','.preview/lesson193-source/*.png','.preview/lesson193-raw/*.json','.preview/lesson193-excerpts/*','.preview/lesson193-decoded/*','.preview/lesson193-deliverables/*.json','.preview/lesson193-deliverables/*.png','.preview/lesson193-deliverables/*.pdf','.preview/lesson193-deliverables/*.html']:
 paths.update(p for p in root.glob(pattern) if p.is_file())
for p in ['content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx']:paths.add(root/p)
if (root/'lesson-193-published-snapshot.json').exists():paths.add(root/'lesson-193-published-snapshot.json')
paths.discard(out/'lesson-193-package-integrity.json')
status=json.loads((root/'docs/lesson-193-execution-status.json').read_text())
report={'status':'verified draft archive integrity; review states remain separate','source_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'owner_release_approval':False,'pending_reviews':status.get('pending',[]),'inline_media_exact_matches':len(receipts),'files':[]}
target=out/'lesson-1.9.3-charlaine-draft-review.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(paths):
  name=p.as_posix();assert not name.startswith('/') and '..' not in p.parts and chr(92) not in name
  b=p.read_bytes();z.writestr(name,b);report['files'].append({'member':name,'bytes':len(b),'sha256':sha(b)})
with zipfile.ZipFile(target) as z:
 assert len(z.namelist())==len(set(z.namelist()));assert z.testzip() is None
 for f in report['files']:
  b=z.read(f['member']);assert len(b)==f['bytes'] and sha(b)==f['sha256']
assert target.stat().st_size<512*1024*1024
report.update(zip_bytes=target.stat().st_size,zip_sha256=sha(target.read_bytes()),safe_unique_paths=True,CRC_checked=True)
(out/'lesson-193-package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified draft ZIP',len(paths),'members;',len(receipts),'exact inline media matches;',target.stat().st_size,'bytes')

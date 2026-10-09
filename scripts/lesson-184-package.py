"""Package a review draft with exact inline-media/ZIP integrity and explicit blockers."""
import pathlib,json,hashlib,zipfile,base64,subprocess
root=pathlib.Path('.');out=root/'.preview/lesson184-deliverables';html=out/'lesson-1.8.4-apple-review.html';assert html.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
receipts=json.loads((out/'lesson-184-inline-media.json').read_text());text=html.read_text()
for p,v in receipts.items():
 b=(root/'public'/p.lstrip('/')).read_bytes();assert len(b)==v['bytes'] and sha(b)==v['sha256'] and base64.b64encode(b).decode() in text,p
paths=set()
for pattern in ['docs/lesson-184-*','docs/lesson-18-apple-*','scripts/lesson-184-*','scripts/remotion-safety-demonstrate-narrate.mjs','scripts/lib/lesson-184-integration.mjs','scripts/tests/lesson-184.test.mjs','.github/workflows/lesson184-*.yml','content/training/day1-basic-competencies/modules/08-osh/lessons/safety-demonstrate/*','public/training/audio/08-osh/safety-demonstrate/*','public/training/bhw-1-8/*','remotion/src/safety-demonstrate/*','remotion/public/safety-demonstrate/*','.preview/lesson184-source/*.txt','.preview/lesson184-source/*.png','.preview/lesson184-raw/*.json','.preview/lesson184-excerpts/*','.preview/lesson184-deliverables/*.json','.preview/lesson184-deliverables/*.png','.preview/lesson184-deliverables/*.pdf','.preview/lesson184-deliverables/*.html']:
 paths.update(p for p in root.glob(pattern) if p.is_file())
paths.add(root/'content/training/day1-basic-competencies/narration.json');paths.add(root/'remotion/src/Root.tsx');paths.add(root/'src/components/elearning/reference-lessons.tsx')
if (root/'lesson-184-published-snapshot.json').exists():paths.add(root/'lesson-184-published-snapshot.json')
paths.discard(out/'lesson-184-package-integrity.json')
status=json.loads((root/'docs/lesson-184-execution-status.json').read_text())
report={'status':'verified draft archive integrity; see execution-status for review/check blockers','source_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'owner_release_approval':False,'pending_reviews':status['pending'],'inline_media_exact_matches':len(receipts),'files':[]}
target=out/'lesson-1.8.4-apple-draft-review.zip'
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
(out/'lesson-184-package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified draft ZIP',len(paths),'members;',len(receipts),'exact inline media matches;',target.stat().st_size,'bytes')

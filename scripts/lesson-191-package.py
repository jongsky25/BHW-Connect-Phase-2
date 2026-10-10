"""Package a review draft with exact inline-media/ZIP integrity and explicit blockers."""
import pathlib,json,hashlib,zipfile,base64,subprocess
root=pathlib.Path('.');out=root/'.preview/lesson191-deliverables';html=out/'lesson-1.9.1-charlaine-review.html';assert html.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
receipts=json.loads((out/'lesson-191-inline-media.json').read_text());text=html.read_text()
for p,v in receipts.items():
 b=(root/'public'/p.lstrip('/')).read_bytes();assert len(b)==v['bytes'] and sha(b)==v['sha256'] and base64.b64encode(b).decode() in text,p
# Review receipts must describe the exact shipped sources and packaged WAVs.
manifest=json.loads((root/'content/training/day1-basic-competencies/narration.json').read_text())
full=json.loads((root/'docs/lesson-191-audio-review.json').read_text())
focus=json.loads((root/'docs/lesson-191-audio-focus.json').read_text())
assert len(full['records'])==14 and len(focus['records'])==14
for record in full['records']:
 if record['id'].startswith('story-'):
  media=root/f"remotion/public/resources-audit/shipped-aac-{record['language']}.wav"
  assert sha((root/'public'/record['source_video'].lstrip('/')).read_bytes())==record['source_video_sha256']
 else:
  section,language=record['id'].removeprefix('read-resources-audit-').rsplit('-',1)
  media=root/'public'/manifest['lessons']['resources-audit']['sections'][section][language]['src'].lstrip('/')
 assert sha(media.read_bytes())==record['sha256'],record['id']
assert sum(len(record['excerpts']) for record in focus['records'])==56
for record in focus['records']:
 assert sha((root/'public'/record['source_path'].lstrip('/')).read_bytes())==record['source_sha256']
 for excerpt in record['excerpts']:
  assert sha((root/'.preview/lesson191-excerpts'/excerpt['file']).read_bytes())==excerpt['excerpt_sha256']
paths=set()
for pattern in ['docs/lesson-191-*','docs/lesson-18-charlaine-*','scripts/lesson-191-*','scripts/remotion-resources-audit-narrate.mjs','scripts/lib/lesson-191-integration.mjs','scripts/tests/lesson-191.test.mjs','.github/workflows/lesson191-*.yml','content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-audit/*','public/training/audio/09-sustainable-practices/resources-audit/*','public/training/bhw-1-9/*','remotion/src/resources-audit/*','remotion/public/resources-audit/*','.preview/lesson191-source/*.txt','.preview/lesson191-source/*.png','.preview/lesson191-raw/*.json','.preview/lesson191-excerpts/*','.preview/lesson191-deliverables/*.json','.preview/lesson191-deliverables/*.png','.preview/lesson191-deliverables/*.pdf','.preview/lesson191-deliverables/*.html']:
 paths.update(p for p in root.glob(pattern) if p.is_file())
paths.add(root/'content/training/day1-basic-competencies/narration.json');paths.add(root/'remotion/src/Root.tsx');paths.add(root/'src/components/elearning/reference-lessons.tsx')
if (root/'lesson-191-published-snapshot.json').exists():paths.add(root/'lesson-191-published-snapshot.json')
paths.discard(out/'lesson-191-package-integrity.json')
status=json.loads((root/'docs/lesson-191-execution-status.json').read_text())
report={'status':'verified draft archive integrity; see execution-status for review/check blockers','source_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'owner_release_approval':False,'pending_reviews':status['pending'],'inline_media_exact_matches':len(receipts),'files':[]}
target=out/'lesson-1.9.1-charlaine-draft-review.zip'
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
(out/'lesson-191-package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified draft ZIP',len(paths),'members;',len(receipts),'exact inline media matches;',target.stat().st_size,'bytes')

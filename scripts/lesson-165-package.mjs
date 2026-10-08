// Freeze a complete review ZIP with verified unique paths, CRC and inline media.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const program=String.raw`
import pathlib,json,hashlib,zipfile,base64,re,subprocess
r=pathlib.Path('.');out=r/'.preview/lesson165-deliverables';html=out/'lesson-1.6.5-gibs-review.html'
if not html.exists():raise RuntimeError('Complete review HTML required')
verification=json.loads((out/'lesson-1.6.5-verification.json').read_text())
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
assert verification['status']=='passed' and verification['source_commit']==head
assert verification['normal_CI']['status']=='passed' and verification['normal_CI']['head_sha']==head,'Complete exact-head CI required before packaging'

sha=lambda b:hashlib.sha256(b).hexdigest()
receipts=json.loads((out/'lesson-165-inline-media.json').read_text());text=html.read_text()
for p,v in receipts.items():
 b=(r/'public'/p.lstrip('/')).read_bytes()
 assert len(b)==v['bytes'] and sha(b)==v['sha256'] and base64.b64encode(b).decode() in text,p
paths=set()
for pattern in ['docs/lesson-165-*','scripts/lesson-165-*','scripts/remotion-communication-handoff-narrate.mjs','scripts/tests/lesson-165.test.mjs','scripts/tests/lesson-165-proposal-compat.mjs','scripts/lib/communication-handoff-speech.mjs','scripts/lib/reference-narration.mjs','content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-handoff/**/*','remotion/src/communication-handoff/*','remotion/public/communication-handoff/*','public/training/bhw-1-6/gibs-handoff-*','public/training/bhw-1-6/communication-handoff-*','public/training/bhw-1-6/gibs-portrait-*','public/training/audio/06-komunikasyon/communication-handoff/**/*','.preview/lesson165-source/*-p*','.preview/lesson165-source/privacy-irr.html','.preview/lesson165-source/tesda-filter.html','.preview/lesson165-excerpts/*','.preview/lesson165-deliverables/*.json','.preview/lesson165-deliverables/*.png','.preview/lesson165-deliverables/*.pdf','.preview/lesson165-deliverables/lesson-165-print-kit.*.html']:
 paths.update(p for p in r.glob(pattern) if p.is_file())
paths.update([html,r/'content/training/day1-basic-competencies/narration.json',r/'remotion/src/Root.tsx',r/'src/components/elearning/reference-lessons.tsx',r/'content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json'])
if (r/'lesson-165-published-snapshot.json').exists():paths.add(r/'lesson-165-published-snapshot.json')
# Raw requests/responses retained in a separate hash-pinned archive; no duplicate full ZIP+inputs artifact.
raw_paths=sorted(set(p for pattern in ['.preview/lesson165-raw/*','.preview/lesson165-retained-raw/**/*'] for p in r.glob(pattern) if p.is_file()))
assert raw_paths,'Retained raw model evidence required'
evidence_dir=r/'.preview/lesson165-evidence-archives';evidence_dir.mkdir(parents=True,exist_ok=True)
raw_zip=evidence_dir/'lesson165-raw-evidence.zip'
with zipfile.ZipFile(raw_zip,'w',zipfile.ZIP_DEFLATED) as z:
 for p in raw_paths:
  name=p.as_posix();assert not name.startswith('/') and '..' not in p.parts and chr(92) not in name
  z.writestr(name,p.read_bytes())
with zipfile.ZipFile(raw_zip) as z:assert len(z.namelist())==len(set(z.namelist())) and z.testzip() is None
assert raw_zip.stat().st_size<512*1024*1024
raw_receipt={'archive':raw_zip.name,'sha256':sha(raw_zip.read_bytes()),'bytes':raw_zip.stat().st_size,'safe_unique_members':True,'CRC_checks':True,'files':[{'member':p.as_posix(),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in raw_paths]}
raw_manifest=out/'lesson-165-raw-evidence-integrity.json';raw_manifest.write_text(json.dumps(raw_receipt,indent=2)+'\n');paths.add(raw_manifest)
(evidence_dir/'lesson-165-raw-evidence-integrity.json').write_bytes(raw_manifest.read_bytes())
# Integrity receipt remains outside the archive to avoid a self-reference.
paths.discard(out/'lesson-165-package-integrity.json')
report={'status':'passed','inline_media_exact_matches':len(receipts),'files':[]};target=out/'lesson-1.6.5-gibs-review.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(paths):
  name=p.as_posix();assert not name.startswith('/') and '..' not in p.parts and chr(92) not in name
  b=p.read_bytes();z.writestr(name,b);report['files'].append({'member':name,'bytes':len(b),'sha256':sha(b)})
with zipfile.ZipFile(target) as z:
 names=z.namelist();assert len(names)==len(set(names));assert z.testzip() is None
 for f in report['files']:assert sha(z.read(f['member']))==f['sha256']
assert target.stat().st_size<512*1024*1024
report.update({'zip_bytes':target.stat().st_size,'zip_sha256':sha(target.read_bytes()),'safe_unique_members':True,'CRC_checks':True,'source_byte_matches':True})
(out/'lesson-165-package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified ZIP:',len(paths),'members;',len(receipts),'exact inline media matches')
`;
fs.mkdirSync(root+'/.preview/lesson165-deliverables',{recursive:true});
execFileSync('python3',['-c',program],{cwd:root,stdio:'inherit'});

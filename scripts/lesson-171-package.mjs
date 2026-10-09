// Freeze a complete review ZIP with verified unique paths, CRC and inline media.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const program=String.raw`
import pathlib,json,hashlib,zipfile,base64,re,subprocess
r=pathlib.Path('.');out=r/'.preview/lesson171-deliverables';html=out/'lesson-1.7.1-carole-review.html'
if not html.exists():raise RuntimeError('Complete review HTML required')
verification=json.loads((out/'lesson-1.7.1-verification.json').read_text())
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
assert verification['status']=='passed' and verification['source_commit']==head
assert verification['normal_CI']['status']=='passed' and verification['normal_CI']['head_sha']==head,'Complete exact-head CI required before packaging'

sha=lambda b:hashlib.sha256(b).hexdigest()
receipts=json.loads((out/'lesson-171-inline-media.json').read_text());text=html.read_text()
for p,v in receipts.items():
 b=(r/'public'/p.lstrip('/')).read_bytes()
 assert len(b)==v['bytes'] and sha(b)==v['sha256'] and base64.b64encode(b).decode() in text,p
paths=set()
for pattern in ['docs/lesson-171-*','docs/lesson-171-source-evidence/*','docs/lesson-17-carole-*','docs/lesson-17-reference/*','.github/workflows/lesson171-*.yml','.github/workflows/ci.yml','.github/workflows/remotion.yml','scripts/lesson-171-*','scripts/remotion-problem-define-narrate.mjs','scripts/tests/lesson-171.test.mjs','scripts/lib/lesson-171-integration.mjs','scripts/lib/lesson-164-integration.mjs','scripts/lib/lesson-165-integration.mjs','scripts/tests/lesson-165-integration.test.mjs','scripts/tests/lesson-164-integration.test.mjs','scripts/lib/problem-define-speech.mjs','scripts/lib/reference-narration.mjs','scripts/lib/tts-providers/gemini.mjs','content/training/day1-basic-competencies/modules/07-problema/lessons/problem-define/*','remotion/src/problem-define/*','remotion/public/problem-define/*','public/training/bhw-1-7/define-*','public/training/bhw-1-7/problem-define-*','public/training/audio/07-problema/problem-define/*','.preview/lesson171-source/*-p*','.preview/lesson171-raw/*','.preview/lesson171-initial-raw/*','.preview/lesson171-initial-media/*','.preview/lesson171-initial-excerpts/*','.preview/lesson171-excerpts/*','.preview/lesson171-deliverables/*.json','.preview/lesson171-deliverables/*.png','.preview/lesson171-deliverables/*.pdf','.preview/lesson171-deliverables/lesson-171-print-kit.*.html','.preview/lesson171-deliverables/lesson-171-statement-aid.*.html']:
 paths.update(p for p in r.glob(pattern) if p.is_file())
paths.update([html,r/'content/training/day1-basic-competencies/modules/07-problema/module.json',r/'content/training/day1-basic-competencies/narration.json',r/'remotion/src/Root.tsx',r/'src/components/elearning/reference-lessons.tsx',r/'content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json'])
if (r/'lesson-171-published-snapshot.json').exists():paths.add(r/'lesson-171-published-snapshot.json')
# Integrity receipt remains outside the archive to avoid a self-reference.
paths.discard(out/'lesson-171-package-integrity.json')
report={'status':'passed','source_commit':head,'inline_media_exact_matches':len(receipts),'files':[]};target=out/'lesson-1.7.1-carole-review.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(paths):
  name=p.as_posix();assert not name.startswith('/') and '..' not in p.parts and chr(92) not in name
  b=p.read_bytes();z.writestr(name,b);report['files'].append({'member':name,'bytes':len(b),'sha256':sha(b)})
with zipfile.ZipFile(target) as z:
 names=z.namelist();assert len(names)==len(set(names));assert z.testzip() is None
 for f in report['files']:
  b=z.read(f['member']);assert len(b)==f['bytes'] and z.getinfo(f['member']).file_size==f['bytes'] and sha(b)==f['sha256']
assert target.stat().st_size < 512*1024*1024,'Review artifact exceeds 512 MiB; split raw evidence first'
report.update({'zip_bytes':target.stat().st_size,'zip_sha256':sha(target.read_bytes()),'safe_unique_members':True,'CRC_checks':True,'source_byte_matches':True})
(out/'lesson-171-package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified ZIP:',len(paths),'members;',len(receipts),'exact inline media matches')
`;
fs.mkdirSync(root+'/.preview/lesson171-deliverables',{recursive:true});
execFileSync('python3',['-c',program],{cwd:root,stdio:'inherit'});

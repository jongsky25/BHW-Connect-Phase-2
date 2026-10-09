// Freeze a complete review ZIP with verified unique paths, CRC and inline media.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const program=String.raw`
import pathlib,json,hashlib,zipfile,base64,re,subprocess
r=pathlib.Path('.');out=r/'.preview/lesson174-deliverables';html=out/'lesson-1.7.4-carole-review.html'
if not html.exists():raise RuntimeError('Complete review HTML required')
verification=json.loads((out/'lesson-1.7.4-verification.json').read_text())
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
assert verification['status']=='passed' and verification['source_commit']==head
assert verification['normal_CI']['status']=='passed' and verification['normal_CI']['head_sha']==head,'Complete exact-head CI required before packaging'

sha=lambda b:hashlib.sha256(b).hexdigest()
receipts=json.loads((out/'lesson-174-inline-media.json').read_text());text=html.read_text()
for p,v in receipts.items():
 b=(r/'public'/p.lstrip('/')).read_bytes()
 assert len(b)==v['bytes'] and sha(b)==v['sha256'] and base64.b64encode(b).decode() in text,p
paths=set()
for pattern in ['docs/lesson-174-*','docs/lesson-174-source-evidence/*','docs/lesson-174-illustration-evidence/*','scripts/lesson-174-*','scripts/remotion-problem-action-plan-narrate.mjs','scripts/tests/lesson-174.test.mjs','scripts/lib/lesson-174-proposal.mjs','scripts/lib/reference-narration.mjs','scripts/lib/tts-providers/gemini.mjs','content/training/day1-basic-competencies/modules/07-problema/lessons/problem-action-plan/*','remotion/src/problem-action-plan/*','remotion/public/problem-action-plan/*','public/training/bhw-1-7/*','public/training/audio/07-problema/**/*','.preview/lesson174-source/*-p*','.preview/lesson174-raw/*','.preview/lesson174-initial-raw/*','.preview/lesson174-initial-media/*','.preview/lesson174-initial-excerpts/*','.preview/lesson174-excerpts/*','.preview/lesson174-deliverables/*.json','.preview/lesson174-deliverables/*.log','.preview/lesson174-deliverables/*.png','.preview/lesson174-deliverables/*.pdf','.preview/lesson174-deliverables/lesson-174-print-kit.*.html']:
 paths.update(p for p in r.glob(pattern) if p.is_file())
paths.update([r/'docs/lesson-17-reference/carole-character-reference-6e2b1c5044d7.png',r/'docs/lesson-17-carole-continuity.md',r/'docs/lesson-17-carole-reference.json',html,r/'content/training/day1-basic-competencies/narration.json',r/'remotion/src/Root.tsx',r/'src/components/elearning/reference-lessons.tsx',r/'content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json'])
if (r/'lesson-174-published-snapshot.json').exists():paths.add(r/'lesson-174-published-snapshot.json')
# Integrity receipt remains outside the archive to avoid a self-reference.
paths.discard(out/'lesson-174-package-integrity.json')
report={'status':'passed','inline_media_exact_matches':len(receipts),'files':[]};target=out/'lesson-1.7.4-carole-review.zip'
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
(out/'lesson-174-package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified ZIP:',len(paths),'members;',len(receipts),'exact inline media matches')
`;
fs.mkdirSync(root+'/.preview/lesson174-deliverables',{recursive:true});
execFileSync('python3',['-c',program],{cwd:root,stdio:'inherit'});

// Freeze a complete review ZIP with verified unique paths, CRC and inline media.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const program=String.raw`
import pathlib,json,hashlib,zipfile,base64,re,subprocess
r=pathlib.Path('.');out=r/'.preview/lesson181-deliverables';html=out/'lesson-1.8.1-apple-review.html'
if not html.exists():raise RuntimeError('Complete review HTML required')
verification=json.loads((out/'lesson-1.8.1-verification.json').read_text())
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
assert verification['status'] in ['passed','draft_complete_with_inherited_ci_failure'] and verification['source_commit']==head
assert verification['normal_CI']['status'] in ['passed','completed_with_inherited_failure'] and verification['normal_CI']['head_sha']==head,'Complete exact-head CI result required before packaging'

sha=lambda b:hashlib.sha256(b).hexdigest()
receipts=json.loads((out/'lesson-181-inline-media.json').read_text());text=html.read_text()
for p,v in receipts.items():
 b=(r/'public'/p.lstrip('/')).read_bytes()
 assert len(b)==v['bytes'] and sha(b)==v['sha256'] and base64.b64encode(b).decode() in text,p
paths=set()
for pattern in ['docs/lesson-181-*','docs/lesson-181-source-evidence/*','docs/lesson-18-apple-*','.github/workflows/lesson181-*.yml','.github/workflows/ci.yml','.github/workflows/remotion.yml','scripts/lesson-181-*','scripts/remotion-safety-identify-narrate.mjs','scripts/tests/lesson-181.test.mjs','scripts/lib/lesson-181-integration.mjs','scripts/lib/lesson-172-release-integration.mjs','scripts/tests/lesson-172.test.mjs','scripts/tests/lesson-181-integration.test.mjs','scripts/lib/safety-identify-speech.mjs','scripts/lib/reference-narration.mjs','scripts/lib/tts-providers/gemini.mjs','content/training/day1-basic-competencies/modules/08-osh/lessons/safety-identify/*','remotion/src/safety-identify/*','remotion/public/safety-identify/*','public/training/bhw-1-8/apple-*','public/training/bhw-1-8/safety-identify-*','public/training/audio/08-osh/safety-identify/*','.preview/lesson181-source/*','.preview/lesson181-render-logs/*','.preview/lesson181-raw/*','.preview/lesson181-second-raw/*','.preview/lesson181-second-media/*','.preview/lesson181-second-excerpts/*','.preview/lesson181-initial-raw/*','.preview/lesson181-initial-media/*','.preview/lesson181-initial-excerpts/*','.preview/lesson181-excerpts/*','.preview/lesson181-deliverables/*.json','.preview/lesson181-deliverables/*.png','.preview/lesson181-deliverables/*.pdf','.preview/lesson181-deliverables/lesson-181-print-kit.*.html','.preview/lesson181-deliverables/lesson-181-reporting-aid.*.html']:
 paths.update(p for p in r.glob(pattern) if p.is_file())
paths.update([html,r/'content/training/day1-basic-competencies/modules/08-osh/module.json',r/'content/training/day1-basic-competencies/narration.json',r/'remotion/src/Root.tsx',r/'src/components/elearning/reference-lessons.tsx',r/'content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json'])
if (r/'lesson-181-published-snapshot.json').exists():paths.add(r/'lesson-181-published-snapshot.json')
# Integrity receipt remains outside the archive to avoid a self-reference.
paths.discard(out/'lesson-181-package-integrity.json')
tracked=set(subprocess.check_output(['git','ls-files'],text=True).splitlines())
for p in paths:
 if p.as_posix() in tracked:assert p.read_bytes()==subprocess.check_output(['git','show','HEAD:'+p.as_posix()]),'Frozen authored source changed: '+str(p)
report={'status':'passed','full_CI_passed':verification['normal_CI']['status']=='passed','source_commit':head,'inline_media_exact_matches':len(receipts),'files':[]};target=out/'lesson-1.8.1-apple-draft-review.zip'
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
(out/'lesson-181-package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified ZIP:',len(paths),'members;',len(receipts),'exact inline media matches')
`;
fs.mkdirSync(root+'/.preview/lesson181-deliverables',{recursive:true});
execFileSync('python3',['-c',program],{cwd:root,stdio:'inherit'});

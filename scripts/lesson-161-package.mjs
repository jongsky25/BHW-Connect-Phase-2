// Freeze a complete review ZIP with verified unique paths, CRC and inline media.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const program=String.raw`
import pathlib,json,hashlib,zipfile,base64,re
r=pathlib.Path('.');out=r/'.preview/lesson161-deliverables';html=out/'lesson-1.6.1-gibs-review.html'
if not html.exists():raise RuntimeError('Complete review HTML required')
(out/'lesson-1.6.1-mila-review.html').write_bytes(html.read_bytes())
sha=lambda b:hashlib.sha256(b).hexdigest()
receipts=json.loads((out/'lesson-161-inline-media.json').read_text());text=html.read_text()
for p,v in receipts.items():
 b=(r/'public'/p.lstrip('/')).read_bytes()
 assert len(b)==v['bytes'] and sha(b)==v['sha256'] and base64.b64encode(b).decode() in text,p
paths=set()
for pattern in ['docs/lesson-161-*','scripts/lesson-161-*','scripts/remotion-communication-listen-narrate.mjs','scripts/tests/lesson-161.test.mjs','content/training/day1-basic-competencies/modules/06-komunikasyon/**/*','remotion/src/communication-listen/*','remotion/public/communication-listen/*','public/training/bhw-1-6/*','public/training/audio/06-komunikasyon/**/*','.preview/lesson161-source/*-p*','.preview/lesson161-source/privacy-irr.html','.preview/lesson161-source/tesda-filter.html','.preview/lesson161-raw/*','.preview/lesson161-initial-raw/*','.preview/lesson161-excerpts/*','.preview/lesson161-deliverables/*.json','.preview/lesson161-deliverables/*.png','.preview/lesson161-deliverables/*.pdf','.preview/lesson161-deliverables/lesson-161-print-kit.*.html']:
 paths.update(p for p in r.glob(pattern) if p.is_file())
paths.update([html,out/'lesson-1.6.1-mila-review.html',r/'content/training/day1-basic-competencies/narration.json',r/'remotion/src/Root.tsx',r/'src/components/elearning/reference-lessons.tsx',r/'content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json'])
report={'status':'passed','inline_media_exact_matches':len(receipts),'files':[]};target=out/'lesson-1.6.1-gibs-review.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(paths):
  name=p.as_posix();assert not name.startswith('/') and '..' not in p.parts and chr(92) not in name
  b=p.read_bytes();z.writestr(name,b);report['files'].append({'member':name,'bytes':len(b),'sha256':sha(b)})
with zipfile.ZipFile(target) as z:
 names=z.namelist();assert len(names)==len(set(names));assert z.testzip() is None
 for f in report['files']:assert sha(z.read(f['member']))==f['sha256']
report.update({'zip_bytes':target.stat().st_size,'zip_sha256':sha(target.read_bytes()),'safe_unique_members':True,'CRC_checks':True,'source_byte_matches':True})
(out/'lesson-161-package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified ZIP:',len(paths),'members;',len(receipts),'exact inline media matches')
`;
fs.mkdirSync(root+'/.preview/lesson161-deliverables',{recursive:true});
execFileSync('python3',['-c',program],{cwd:root,stdio:'inherit'});

// Safe self-contained package; raw evidence split into its own hash-pinned archive.
import {execFileSync} from 'node:child_process';
execFileSync('python3',['-c',String.raw`
import pathlib,json,hashlib,zipfile,base64,subprocess
r=pathlib.Path('.');out=r/'.preview/lesson163-deliverables';html=out/'lesson-1.6.3-gibs-review.html';head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
v=json.loads((out/'lesson-1.6.3-verification.json').read_text());assert v['status']=='passed' and v['source_commit']==head and v['normal_CI']['head_sha']==head and v['normal_CI']['status']=='passed'
sha=lambda b:hashlib.sha256(b).hexdigest()
def archive(target,paths):
 rows=[]
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(paths):
   name=p.as_posix();assert not name.startswith('/') and '..' not in p.parts and chr(92) not in name
   b=p.read_bytes();z.writestr(name,b);rows.append({'member':name,'bytes':len(b),'sha256':sha(b)})
 with zipfile.ZipFile(target) as z:
  names=z.namelist();assert len(names)==len(set(names));assert z.testzip() is None
  for f in rows:assert len(z.read(f['member']))==f['bytes'] and sha(z.read(f['member']))==f['sha256']
 assert target.stat().st_size<512*1024*1024
 return {'zip_name':target.name,'zip_bytes':target.stat().st_size,'zip_sha256':sha(target.read_bytes()),'safe_unique_members':True,'CRC_checks':True,'source_byte_matches':True,'files':rows}
raw=set()
for pattern in ['.preview/lesson163-raw/*.json','.preview/lesson163-excerpts/*.wav']:
 raw.update(p for p in r.glob(pattern) if p.is_file())
raw_report=archive(out/'lesson-1.6.3-raw-evidence.zip',raw)
(out/'lesson-163-raw-evidence-integrity.json').write_text(json.dumps(raw_report,indent=2)+'\n')
receipts=json.loads((out/'lesson-163-inline-media.json').read_text());text=html.read_text()
for p,v in receipts.items():
 b=(r/'public'/p.lstrip('/')).read_bytes();assert len(b)==v['bytes'] and sha(b)==v['sha256'] and base64.b64encode(b).decode() in text,p
paths={html,r/'content/training/day1-basic-competencies/narration.json',r/'remotion/src/Root.tsx',r/'src/components/elearning/reference-lessons.tsx',r/'content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json',r/'lesson-163-published-snapshot.json'}
for p in receipts:paths.add(r/'public'/p.lstrip('/'))
for pattern in ['docs/lesson-163-*','docs/source-material/lesson-163/*','scripts/lesson-163-*','scripts/remotion-communication-explain-narrate.mjs','scripts/tests/lesson-163*','content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/*','remotion/src/communication-explain/*','remotion/public/communication-explain/*','.preview/lesson163-source/*-p*','.preview/lesson163-deliverables/*.json','.preview/lesson163-deliverables/*.png','.preview/lesson163-deliverables/*.pdf','.preview/lesson163-deliverables/lesson-163-print-kit.*.html']:
 paths.update(p for p in r.glob(pattern) if p.is_file())
paths.discard(out/'lesson-163-package-integrity.json')
report=archive(out/'lesson-1.6.3-gibs-review.zip',paths)
report.update({'status':'passed','source_commit':head,'inline_media_exact_matches':len(receipts),'raw_evidence_archive':{k:v for k,v in raw_report.items() if k!='files'},'human_listening':'pending','owner_review':'pending','local_policy_SME_review':'pending'})
(out/'lesson-163-package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified review ZIP',len(paths),'members;',len(receipts),'inline media matches; separate raw evidence',len(raw),'members')
`],{stdio:'inherit'});

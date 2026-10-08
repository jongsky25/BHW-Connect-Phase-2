"""Freeze verified draft bytes. Inputs are retained CI receipts, never synthetic pass results."""
import argparse, base64, hashlib, json, pathlib, shutil, subprocess, zipfile
from datetime import datetime, timezone
p=argparse.ArgumentParser();p.add_argument('--evidence',required=True);p.add_argument('--output',required=True);args=p.parse_args()
r=pathlib.Path(__file__).resolve().parents[1];e=pathlib.Path(args.evidence).resolve();out=pathlib.Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
j=lambda p:json.loads(p.read_text())
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=r,text=True).strip()
verification=j(e/'lesson-1.5.4-verification.json');assert verification['source_commit']==head
browser=j(e/'lesson-154-browser-verification.json');assert browser['source_commit']==head and browser['status']=='passed' and len(browser['records'])==60
assert verification['regression']['compositions']==68 and verification['regression']['outputs']==136 and verification['regression']['size_warnings']==0
assert verification['regression']['source_commit']==head
assert verification['protection']['status']=='passed'
assert verification['audio_joins']['full_reviews']==14 and verification['audio_joins']['focused_reviews']==56
html=(e/'lesson-1.5.4-malou-review.html').read_bytes();selected=j(e/'inline-media-manifest.json');assert len(selected)==19
members={}
def add(name,b):
 q=pathlib.PurePosixPath(name);assert not q.is_absolute() and '..' not in q.parts and name not in members
 members[name]=b
add('lesson-1.5.4-malou-review.html',html)
for a in selected:
 b=(r/'public'/a['path'].lstrip('/')).read_bytes();assert sha(b)==a['sha256'] and len(b)==a['bytes'];assert base64.b64encode(b) in html
 add('selected-media/'+a['path'].lstrip('/'),b)
# Capture committed changed sources and the unchanged production selectors/adapters they use.
files=set(subprocess.check_output(['git','diff','--name-only','e962d4263eae525bca38679a218df623d6eb286f',head],cwd=r,text=True).splitlines())
files.update(['src/components/elearning/lesson-asset-figure.tsx','src/components/elearning/reference-read-section.tsx','src/lib/elearning/reference-narration.ts','src/lib/elearning/narration-zones.ts','src/app/globals.css','scripts/lib/reference-content.mjs','scripts/lib/facilitator-content.mjs','package.json','package-lock.json','remotion/package.json','remotion/package-lock.json'])
for name in sorted(files):
 f=r/name
 if f.is_file():add('source/'+name,subprocess.check_output(['git','show',head+':'+name],cwd=r))
for subtree in ['sources','raw-exchanges','audio-excerpts','workflow-artifacts','screenshots','reports']:
 d=e/subtree;assert d.is_dir(),subtree
 for f in sorted(d.rglob('*')):
  if f.is_file():add(subtree+'/'+f.relative_to(d).as_posix(),f.read_bytes())
for name in ['lesson-1.5.4-verification.json','lesson-154-browser-verification.json','inline-media-manifest.json']:
 add(name,(e/name).read_bytes())
readme=f'''# Lesson 1.5.4 — bilingual draft review

Source commit: {head}
Draft PR: https://github.com/jongsky25/BHW-Connect-Phase-2/pull/261

Open lesson-1.5.4-malou-review.html in a browser. The file includes both languages, all six Read and Slides screens with imagery, 12 narration tracks, two optional narrated stories, full facilitator guides and evidence. All 19 selected media are embedded. Completion is simulated in this review and saves no course progress.

The browser evidence uses actual production components with explicit browser-only Next adapters, one loopback HTTP load followed by true offline playback. No authenticated production playback, Chat Guide or dashboard claim is made.

Read lesson-1.5.4-verification.json for measured counts, exact CI results and known historical guard failures. Raw model exchanges and review disagreements are retained. Model review is not human listening, independent policy SME signoff or owner approval.

This package is a draft. No merge, production deployment or content publication is authorized by its creation. Historical released source/media and receipts remain protected.
'''
add('README.md',readme.encode())
manifest={n:{'sha256':sha(b),'bytes':len(b)} for n,b in members.items()}
add('member-sha256.json',(json.dumps(manifest,indent=2)+'\n').encode())
zip_path=out/'lesson-1.5.4-malou-review.zip';assert not zip_path.exists(),'Never overwrite a frozen package'
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for name,b in sorted(members.items()):z.writestr(name,b)
with zipfile.ZipFile(zip_path) as z:
 assert z.testzip() is None and len(z.namelist())==len(set(z.namelist()))==len(members)
 for name,b in members.items():assert z.read(name)==b
 for a in selected:assert z.read('selected-media/'+a['path'].lstrip('/'))==(r/'public'/a['path'].lstrip('/')).read_bytes()
(out/'lesson-1.5.4-malou-review.html').write_bytes(html)
shutil.copyfile(e/'lesson-1.5.4-verification.json',out/'lesson-1.5.4-verification.json')
receipt={'frozen_at':datetime.now(timezone.utc).isoformat(),'source_commit':head,'owner_approval':'pending','zip':{'file':zip_path.name,'bytes':zip_path.stat().st_size,'sha256':sha(zip_path.read_bytes()),'crc':'passed','unique_safe_members':len(members)},'html':{'file':'lesson-1.5.4-malou-review.html','bytes':len(html),'sha256':sha(html)},'selected_media_count':19,'source_equals_zip_equals_inline':True,'members':{n:{'sha256':sha(b),'bytes':len(b)} for n,b in members.items()}}
(out/'lesson-1.5.4-package-integrity.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({k:v for k,v in receipt.items() if k!='members'}))

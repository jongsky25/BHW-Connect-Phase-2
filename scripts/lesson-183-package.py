"""Hash-pinned private draft package with safe/unique members and external receipt."""
from pathlib import Path,PurePosixPath
import zipfile,json,hashlib,subprocess,re
root=Path(__file__).resolve().parent.parent
out=root/'.preview/lesson183-deliverables';out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
entries={}
def add(p,name):
 assert name not in entries and not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts
 entries[name]=p
for p in out.iterdir():
 if p.is_file() and p.suffix not in ['.zip'] and p.name!='lesson-183-package-integrity.json':add(p,'review/'+p.name)
for pattern in ['docs/lesson-183-*','docs/lesson-18-apple-reference.json','content/training/day1-basic-competencies/modules/08-osh/lessons/safety-prepare/*','remotion/src/safety-prepare/*','remotion/public/safety-prepare/*','remotion/public/safety-identify/apple-reference.png']:
 for p in root.glob(pattern):
  if p.is_file():add(p,str(p.relative_to(root)))
for folder in ['lesson183-source','lesson183-raw','lesson183-audio']:
 for p in (root/'.preview'/folder).glob('*'):
  if p.is_file() and not p.name.endswith('-original.pdf'):add(p,'evidence/'+folder+'/'+p.name)
inline=json.loads((out/'lesson-183-inline-media.json').read_text())
for url,receipt in inline.items():
 p=root/'public'/url.lstrip('/');assert sha(p.read_bytes())==receipt['sha256'] and p.stat().st_size==receipt['bytes']
 add(p,'media/'+url.lstrip('/'))
name='lesson-1.8.3-apple-draft-review.zip';target=out/name
members={}
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for name,p in sorted(entries.items()):
  b=p.read_bytes();z.writestr(name,b);members[name]={'bytes':len(b),'sha256':sha(b)}
assert target.stat().st_size<512*1024*1024,'Split evidence before distributing files above 512 MiB'
with zipfile.ZipFile(target) as z:
 assert z.testzip() is None;assert len(z.namelist())==len(set(z.namelist()))==len(members)
 for name,r in members.items():
  b=z.read(name);assert len(b)==r['bytes'] and sha(b)==r['sha256']
receipt={'source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'package':target.name,'sha256':sha(target.read_bytes()),'bytes':target.stat().st_size,'status':'draft for review; human listening, clinical/local and owner review remain pending','members':members,'crc':'verified','safe_unique_paths':True,'inline_media_matches':len(inline)}
(out/'lesson-183-package-integrity.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Verified',len(members),'members;',target.stat().st_size,'bytes; SHA256',receipt['sha256'])

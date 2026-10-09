"""Package the incomplete offline draft; validate paths, CRC, sizes and all hashes."""
import pathlib,json,hashlib,zipfile,re,base64,subprocess
root=pathlib.Path(__file__).resolve().parent.parent
out=root/'.preview/lesson173-deliverables'
sha=lambda b:hashlib.sha256(b).hexdigest()
html=(out/'lesson-1.7.3-carole-review.html').read_text()
inline=json.loads((out/'lesson-173-inline-media.json').read_text())
embedded={sha(base64.b64decode(s)):len(base64.b64decode(s)) for s in re.findall(r'data:image/png;base64,([A-Za-z0-9+/=]+)',html)}
for path,e in inline.items():
 b=(root/'public'/path.lstrip('/')).read_bytes()
 assert sha(b)==e['sha256'] and len(b)==e['bytes']
 assert embedded.get(sha(b))==len(b),path
members={}
def add(p,name):
 assert not name.startswith('/') and '..' not in pathlib.PurePosixPath(name).parts and '\\' not in name
 assert name not in members,name
 members[name]=p.read_bytes()
for p in out.rglob('*'):
 if p.is_file() and p.suffix not in ['.zip'] and 'integrity' not in p.name:add(p,'review/'+str(p.relative_to(out)))
for p in (root/'.preview/lesson173-source').iterdir():
 if p.is_file() and p.name!='tesda-full.txt':add(p,'source-evidence/'+p.name)
for p in (root/'.preview/lesson173-media-evidence').iterdir():
 if p.is_file():add(p,'media-evidence/'+p.name)
for p in (root/'docs').glob('lesson-173-*'):
 if p.is_file():add(p,'docs/'+p.name)
leaf=root/'content/training/day1-basic-competencies/modules/07-problema/lessons/problem-prioritize'
for p in leaf.iterdir():
 if p.is_file():add(p,'lesson-source/'+p.name)
for p in (root/'public/training/bhw-1-7').glob('prioritize-*.png'):add(p,'media/'+p.name)
add(root/'docs/lesson-17-reference/carole-character-reference-6e2b1c5044d7.png','media-evidence/carole-reference.png')
for p in (root/'scripts').glob('lesson-173-*'):
 if p.is_file():add(p,'scripts/'+p.name)
source_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip()
manifest={'status':'INCOMPLETE DRAFT: narration/story/published baseline blocked; not release approval','source_commit':source_commit,'members':{n:{'bytes':len(b),'sha256':sha(b)} for n,b in members.items()}}
members['manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
zip_path=out/'lesson-1.7.3-carole-incomplete-draft.zip'
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for n,b in sorted(members.items()):z.writestr(n,b)
with zipfile.ZipFile(zip_path) as z:
 assert len(z.namelist())==len(set(z.namelist()))==len(members)
 assert z.testzip() is None
 for n,b in members.items():assert z.read(n)==b,n
assert zip_path.stat().st_size<512*1024*1024
receipt={'status':'verified incomplete draft archive','source_commit':source_commit,'zip':zip_path.name,'bytes':zip_path.stat().st_size,'sha256':sha(zip_path.read_bytes()),'members':len(members),'safe_unique_paths':True,'CRC':True,'every_size_and_sha256':True,'inline_image_matches':len(inline),'human_listening':'pending','owner_approval':False,'policy_SME':'pending'}
(out/'lesson-173-package-integrity.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))

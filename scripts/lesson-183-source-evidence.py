"""Acquire private original sources and exact excerpts; never claims clinical signoff."""
from pathlib import Path
import json,hashlib,subprocess,fitz,shutil
root=Path(__file__).resolve().parent.parent
out=root/'.preview/lesson183-source';out.mkdir(parents=True,exist_ok=True)
sources=[('facilitator','https://drive.google.com/uc?export=download&id=1FJNtduA8gDDDvW3WtNR5f-ai4f0izD0W',[19,30]),('reference','https://drive.google.com/uc?export=download&id=13auqmQNRLevwxTm3lkMRHX13U1_d0TYs',[21,22,23]),('deck','https://drive.google.com/uc?export=download&id=1ZDIJiTltEzJVFcy-XSA0NivWNvfAKfhY',list(range(69,79))),('tesda','https://www.tesda.gov.ph/Downloadables/Barangay%20Health%20Services%20NC%20II.pdf',[29,30,31,32])]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for p in (root/'docs/lesson-183-authoritative-sources').glob('*'):
 shutil.copyfile(p,out/p.name)
records=[]
prior=json.loads((root/'docs/lesson-183-source-receipts.json').read_text())
for name,url,pages in sources:
 p=out/(name+'-original.pdf')
 if not p.exists():subprocess.run(['curl','-fsSL','--max-time','60',url,'-o',str(p)],check=True)
 assert sha(p)==next(r['sha256'] for r in prior['original_sources'] if r['source']==name),'Original source hash changed'
 doc=fitz.open(p);excerpts=[]
 for n in pages:
  image=out/f'{name}-p{n}.png';text=out/f'{name}-p{n}.txt'
  doc[n-1].get_pixmap(dpi=110).save(image);text.write_text(doc[n-1].get_text())
  excerpts.append({'pdf_page':n,'text_file':text.name,'text_sha256':sha(text),'image_file':image.name,'image_sha256':sha(image)})
 records.append({'source':name,'url':url,'file':p.name,'sha256':sha(p),'pdf_pages':len(doc),'excerpts':excerpts})
(root/'docs/lesson-183-source-receipts.json').write_text(json.dumps({'original_sources':records,'notes':'Original PDFs retained privately. Excerpts are for private owner review. Extraction does not automatically establish inspection or clinical review.'},indent=2)+'\n')
print('Retained four original PDFs and nineteen exact page excerpts.')

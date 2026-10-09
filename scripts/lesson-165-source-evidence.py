"""Retrieve originals through their established public URLs; private draft audit only."""
import pathlib,json,hashlib,subprocess,fitz
root=pathlib.Path(__file__).resolve().parent.parent;out=root/'.preview/lesson165-source';out.mkdir(parents=True,exist_ok=True)
audit=json.loads((root/'docs/lesson-165-source-audit.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources=[('reference','https://drive.google.com/uc?export=download&id=13auqmQNRLevwxTm3lkMRHX13U1_d0TYs',[18,19,30]),('facilitator','https://drive.google.com/uc?export=download&id=1FJNtduA8gDDDvW3WtNR5f-ai4f0izD0W',[28]),('deck','https://drive.google.com/uc?export=download&id=1ZDIJiTltEzJVFcy-XSA0NivWNvfAKfhY',list(range(52,58))),('tesda','https://www.tesda.gov.ph/Downloadables/Barangay%20Health%20Services%20NC%20II.pdf',[26,27,28])]
for name,url,pages in sources:
 file=out/(name+'-original.pdf' if name!='tesda' else 'tesda-bhs.pdf')
 if not file.exists():subprocess.run(['curl','-fsSL',url,'-o',str(file)],check=True)
 expected=next((s['sha256'] for s in audit['original_pdfs'] if s['file']==file.name),audit['tesda_verification']['file_sha256'] if name=='tesda' else None)
 assert sha(file)==expected,file
 doc=fitz.open(file)
 for n in pages:
  image=out/f'{name}-p{n}.png';doc[n-1].get_pixmap(dpi=110).save(str(image));(out/f'{name}-p{n}.txt').write_text(doc[n-1].get_text())
  expected_image=next(s['sha256'] for s in audit['original_page_images_inspected'] if s['file']==image.name)
  assert sha(image)==expected_image,image
print('Verified original PDFs and 13 audited page images; no public redistribution.')

import shutil
for name,expected in [('privacy-irr.html',audit['privacy_primary_source']['sha256']),('tesda-filter.html',audit['tesda_verification']['catalog_sha256'])]:
 file=root/'docs/source-material/lesson-165'/name
 assert sha(file)==expected,file
 shutil.copyfile(file,out/name)

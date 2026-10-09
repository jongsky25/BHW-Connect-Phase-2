"""Restore original excerpts and verify their pinned bytes for private review."""
import pathlib,json,subprocess,hashlib,fitz
r=pathlib.Path(__file__).resolve().parent.parent;out=r/'.preview/lesson171-source';out.mkdir(parents=True,exist_ok=True);audit=json.loads((r/'docs/lesson-171-source-audit.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources=[('reference','https://drive.google.com/uc?export=download&id=13auqmQNRLevwxTm3lkMRHX13U1_d0TYs',[19,20,21]),('facilitator','https://drive.google.com/uc?export=download&id=1FJNtduA8gDDDvW3WtNR5f-ai4f0izD0W',[19,29]),('deck','https://drive.google.com/uc?export=download&id=1ZDIJiTltEzJVFcy-XSA0NivWNvfAKfhY',list(range(59,67))),('tesda','https://www.tesda.gov.ph/Downloadables/Barangay%20Health%20Services%20NC%20II.pdf',[15])]
for name,url,pages in sources:
 p=out/(name+'-original.pdf')
 if not p.exists():subprocess.run(['curl','-fsSL',url,'-o',str(p)],check=True)
 assert sha(p)==next(x['sha256'] for x in audit['original_pdfs'] if x['file']==p.name)
 d=fitz.open(p)
 for n in pages:
  image=out/f'{name}-p{n}.png';d[n-1].get_pixmap(dpi=110).save(image);(out/f'{name}-p{n}.txt').write_text(d[n-1].get_text());assert sha(image)==next(x['sha256'] for x in audit['original_page_images_inspected'] if x['file']==image.name)
print('Verified four original PDF hashes and fourteen exact private page excerpts.')

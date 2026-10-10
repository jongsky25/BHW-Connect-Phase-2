"""Retain and verify the actual private source PDFs and inspected page excerpts."""
import pathlib,json,subprocess,hashlib,fitz
r=pathlib.Path(__file__).resolve().parent.parent;out=r/'.preview/lesson181-source';out.mkdir(parents=True,exist_ok=True)
audit=json.loads((r/'docs/lesson-181-source-audit.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for source in audit['original_sources']:
 name=source['source'];p=out/(name+'-original.pdf')
 if not p.exists():subprocess.run(['curl','-fsSL',source['url'],'-o',str(p)],check=True)
 assert sha(p)==source['original_sha256'],str(p)
 d=fitz.open(p)
 for row in source['pages']:
  n=row['pdf_page'];t=out/f'{name}-p{n}.txt';image=out/f'{name}-p{n}.png'
  t.write_text(d[n-1].get_text());d[n-1].get_pixmap(dpi=100).save(image)
  assert sha(t)==row['text_sha256'],str(t)
  assert sha(image)==row['image_sha256'],str(image)
print('Verified four original PDF hashes and twenty checked page excerpts.')

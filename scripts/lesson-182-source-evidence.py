"""Restore private original PDFs/excerpts from inspected, hash-pinned sources."""
import pathlib,json,subprocess,hashlib,fitz
r=pathlib.Path(__file__).resolve().parent.parent;out=r/'.preview/lesson182-source';out.mkdir(parents=True,exist_ok=True);a=json.loads((r/'docs/lesson-182-source-audit.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for source in a['original_pdfs']:
 p=out/(source['source']+'-original.pdf')
 if not p.exists():subprocess.run(['curl','-fsSL',source['url'],'-o',str(p)],check=True)
 assert sha(p)==source['sha256'],p
 d=fitz.open(p)
 for n in source['pdf_pages_extracted']:
  d[n-1].get_pixmap(dpi=100).save(out/f"{source['source']}-p{n}.png");(out/f"{source['source']}-p{n}.txt").write_text(d[n-1].get_text())
for entry in a['private_evidence_files']:
 p=out/entry['file']
 if p.exists():assert sha(p)==entry['sha256'],p
print('Original PDF hashes verified; private excerpts restored. Webpage captures require their pinned retrieved bytes, not a fresh page substituted as the old evidence.')

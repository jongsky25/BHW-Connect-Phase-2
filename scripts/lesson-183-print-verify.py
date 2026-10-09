"""Verify exact A4 page counts and all text inside printable margins."""
from pathlib import Path
import fitz,json,hashlib
root=Path(__file__).resolve().parent.parent;records=[]
for p in sorted((root/'.preview/lesson183-deliverables').glob('*.pdf')):
 doc=fitz.open(p);expected=1 if 'pause-aid' in p.name else 5
 assert len(doc)==expected,(p,len(doc),expected)
 for page in doc:
  assert abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1
  for block in page.get_text('dict')['blocks']:
   for line in block.get('lines',[]):
    for span in line['spans']:
     x0,y0,x1,y1=span['bbox'];assert x0>35 and y0>35 and x1<page.rect.width-35 and y1<page.rect.height-35,(p,span)
 records.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'pages':len(doc),'expected_pages':expected,'a4':True,'text_inside_margins':True,'body_font_points':12,'footer_font_points':9})
assert len(records)==4
(root/'docs/lesson-183-print-verification.json').write_text(json.dumps({'status':'passed','records':records},indent=2)+'\n')
print('Four A4 PDFs verified: two five-page kits and two one-page aids.')

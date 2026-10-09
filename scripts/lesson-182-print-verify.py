"""Verify actual A4 page count and every text bounding box, retain raster previews."""
import pathlib,json,hashlib,fitz
r=pathlib.Path(__file__).resolve().parent.parent;out=r/'.preview/lesson182-deliverables';records=[]
for lang in ['fil','en']:
 for kind,count in [('print-kit',6),('control-pause-aid',1)]:
  p=out/f'lesson-182-{kind}.{lang}.pdf';d=fitz.open(p);assert len(d)==count,(p,len(d))
  for i,page in enumerate(d):
   assert abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1
   for block in page.get_text('dict')['blocks']:
    if block['type']!=0:continue
    for line in block['lines']:
     for span in line['spans']:
      x0,y0,x1,y1=span['bbox'];assert x0>=40 and y0>=40 and x1<=page.rect.width-40 and y1<=page.rect.height-40,(p,i,span)
   page.get_pixmap(dpi=90).save(out/f'{kind}-{lang}-p{i+1}.png')
  records.append({'path':p.name,'pages':len(d),'A4':True,'all_text_within_margins':True,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(out/'lesson-182-print-verification.json').write_text(json.dumps({'status':'passed','records':records},indent=2)+'\n')
print('Verified two six-page bilingual kits and two one-page A4 aids, all text within margins')

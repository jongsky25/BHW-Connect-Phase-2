import fitz,pathlib,json
out=pathlib.Path('.preview/lesson184-deliverables');report=[]
for lang in ['fil','en']:
 for name,count in [('print-kit',5),('exposure-aid',1)]:
  p=out/f'lesson-184-{name}.{lang}.pdf';d=fitz.open(p);assert len(d)==count,(p,len(d))
  for page in d:
   assert abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1
   for block in page.get_text('dict')['blocks']:
    for line in block.get('lines',[]):
     for span in line['spans']:
      x0,y0,x1,y1=span['bbox'];assert min(x0,y0)>=40 and x1<=page.rect.width-40 and y1<=page.rect.height-40,(p,span['text'])
  report.append({'file':p.name,'pages':len(d),'A4':True,'text_inside_margins':True})
(out/'lesson-184-print-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified two 5-page A4 kits and two genuinely one-page aids; text inside margins')

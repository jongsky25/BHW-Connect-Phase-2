import pathlib,json,hashlib,fitz
out=pathlib.Path('.preview/lesson174-deliverables'); reports=[]
for lang in ['fil','en']:
 p=out/f'lesson-174-print-kit.{lang}.pdf'; d=fitz.open(p); assert len(d)==4
 for i,page in enumerate(d):
  rect=page.rect; words=page.get_text('words'); assert words
  assert abs(rect.width-595.28)<1 and abs(rect.height-841.89)<1
  assert all(w[0]>=0 and w[1]>=0 and w[2]<=rect.width+1 and w[3]<=rect.height+1 for w in words)
  page.get_pixmap(dpi=100).save(out/f'print-{lang}-p{i+1}.png')
  if i==2:
   text=page.get_text().upper()
   assert ('SEVEN' in text and 'PLAN' in text) if lang=='en' else ('PITONG' in text and 'PLANO' in text)
 reports.append({'language':lang,'pages':4,'one_page_plan':3,'A4':list(d[0].rect),'all_text_in_bounds':True,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(out/'lesson-174-print-verification.json').write_text(json.dumps(reports,indent=2)+'\n')
print('Verified two four-page A4 kits, with one-page plans and no clipped text.')

import pathlib,json,hashlib,fitz
out=pathlib.Path('.preview/lesson181-deliverables');reports=[]
for lang in ['fil','en']:
 p=out/f'lesson-181-print-kit.{lang}.pdf';d=fitz.open(p);assert len(d)==4
 for i,page in enumerate(d):
  rect=page.rect;blocks=page.get_text('blocks');assert blocks and all(b[0]>=0 and b[1]>=0 and b[2]<=rect.width+1 and b[3]<=rect.height+1 for b in blocks)
  page.get_pixmap(dpi=100).save(out/f'print-{lang}-p{i+1}.png')
 ap=out/f'lesson-181-reporting-aid.{lang}.pdf';aid=fitz.open(ap);assert len(aid)==1 and '1/1' in aid[0].get_text();assert 'REPORT A HAZARD' in aid[0].get_text() if lang=='en' else 'IULAT ANG PANGANIB' in aid[0].get_text()
 reports.append({'language':lang,'pages':4,'aid_pages':1,'A4':list(d[0].rect),'all_text_in_bounds':True,'kit_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'aid_sha256':hashlib.sha256(ap.read_bytes()).hexdigest()})
(out/'lesson-181-print-verification.json').write_text(json.dumps(reports,indent=2)+'\n')
print('Verified two four-page A4 kits and two single-page task aids.')

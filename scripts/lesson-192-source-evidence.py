"""Fetch original sources and retain exact candidate excerpts for inspection.
No automatic assertion of a completed audit or facility approval.
"""
import pathlib, hashlib, json, subprocess, fitz
root=pathlib.Path(__file__).resolve().parent.parent
out=root/'.preview/lesson192-source';out.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
specs=[('facilitator','https://drive.google.com/uc?export=download&id=1FJNtduA8gDDDvW3WtNR5f-ai4f0izD0W',[19,22,34]),('manual','https://drive.google.com/uc?export=download&id=13auqmQNRLevwxTm3lkMRHX13U1_d0TYs',[14,30]),('tesda','https://www.tesda.gov.ph/Downloadables/Barangay%20Health%20Services%20NC%20II.pdf',[33,34,35]),('deck','https://drive.google.com/uc?export=download&id=1ZDIJiTltEzJVFcy-XSA0NivWNvfAKfhY',[69,78])]
report={'sources':[],'retrieved_at':subprocess.check_output(['date','-u','+%Y-%m-%dT%H:%M:%SZ'],text=True).strip(),'source_review':'excerpts retained; inspect before claiming audit','facility_infection_prevention_review':'pending','owner_approval':False}
for name,url,pages in specs:
 p=out/(name+'.pdf');entry={'id':name,'url':url}
 try:
  if not p.exists():subprocess.run(['curl','-fLsS','--retry','2','--max-time','45',url,'-o',str(p)],check=True)
  d=fitz.open(p);entry.update(sha256=sha(p),bytes=p.stat().st_size,pdf_page_count=len(d),excerpts=[])
  for n in pages:
   t=out/f'{name}-{n}.txt';t.write_text(d[n-1].get_text());img=out/f'{name}-{n}.png';d[n-1].get_pixmap(dpi=110).save(img)
   entry['excerpts'].append({'pdf_page':n,'text_file':t.name,'text_sha256':sha(t),'image_file':img.name,'image_sha256':sha(img),'text_inspected':False,'visual_inspected':False})
 except Exception as error:entry['access_failure']=str(error)
 report['sources'].append(entry)
 (root/'docs/lesson-192-source-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Retained original source candidates; inspection required.')

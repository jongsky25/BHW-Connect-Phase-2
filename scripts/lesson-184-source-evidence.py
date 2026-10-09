"""Retain checked primary excerpts for private review; never republish source PDFs."""
import pathlib,hashlib,json,fitz,re,subprocess
root=pathlib.Path(__file__).resolve().parent.parent
out=root/'.preview/lesson184-source'
out.mkdir(parents=True,exist_ok=True)
expected=json.loads((root/'docs/lesson-184-source-audit.json').read_text()) if (root/'docs/lesson-184-source-audit.json').exists() else None
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
specs=[('facilitator','https://drive.google.com/uc?export=download&id=1FJNtduA8gDDDvW3WtNR5f-ai4f0izD0W',[19,30]),('manual','https://drive.google.com/uc?export=download&id=13auqmQNRLevwxTm3lkMRHX13U1_d0TYs',[21,22,23]),('deck','https://drive.google.com/uc?export=download&id=1ZDIJiTltEzJVFcy-XSA0NivWNvfAKfhY',list(range(69,79))),('tesda','https://www.tesda.gov.ph/Downloadables/Barangay%20Health%20Services%20NC%20II.pdf',[29,30,32]),('who','https://iris.who.int/server/api/core/bitstreams/fc3c8ce2-35d8-4b39-93b1-cb4d060767f0/content',[8])]
report={'retrieved_date':'2026-10-09','method':'Original PDF text inspected; image-only Facilitator 19 and Manual 22/23 visually inspected. Hashes identify fetched bytes, not clinical signoff.','sources':[],'clinical_review':'pending authorized local clinical trainer','owner_review':'pending','discrepancies':['Inventory deck 74–83 is inconsistent with the original 78-page deck: actual OSH 69–78.','Reference Manual hazard tables continue over PDF 22 and 23 (printed 14–15), not PDF 22 alone.','Historical report-to-midwife instruction alone omits the explicit immediate qualified evaluation pathway; current CDC adds it.','Facilitator Guide recommends four hours; the app split 45+60+60+75=240 is an authoring allocation, not TESDA certification.'],'checked_claims':[{'claim':'Four-hour OSH training recommendation','source':'facilitator PDF 19 printed 12 and PDF 30 printed 23'},{'claim':'OSH 400311216: identification, preparation, performance; observation/demonstration with oral questions; simulated workplace permitted','source':'tesda PDF 29/30/32 printed 25/26/28'},{'claim':'Five hazard groups, with vector infection and heat accident coverage','source':'manual PDF 22/23; deck 73–75'},{'claim':'Wash punctures with soap and water, report, immediately seek qualified medical evaluation','source':'CDC What should you do if you have had an occupational exposure?'},{'claim':'Timely access after potential HIV exposure matters','source':'WHO 2024 Guidelines for HIV post-exposure prophylaxis PDF 8, executive summary; no drug/dose/deadline teaching imported'}]}
for name,url,pages in specs:
 p=out/(name+'.pdf')
 if not p.exists():subprocess.run(['curl','-fLsS','--max-time','90',url,'-o',str(p)],check=True)
 if expected:assert sha(p)==next(x['sha256'] for x in expected['sources'] if x['id']==name),name+' original changed'
 doc=fitz.open(p);entry={'id':name,'url':url,'sha256':sha(p),'bytes':p.stat().st_size,'pdf_page_count':len(doc),'excerpts':[]}
 for n in pages:
  txt=out/f'{name}-{n}.txt';txt.write_text(doc[n-1].get_text())
  item={'pdf_page':n,'text_file':txt.name,'sha256':sha(txt),'text_inspected':True,'visual_inspected':name=='facilitator' and n==19 or name=='manual' and n in [22,23]}
  if item['visual_inspected']:
   image=out/f'{name}-{n}.png'
   if not image.exists():doc[n-1].get_pixmap(dpi=90).save(str(image))
   item['image_file']=image.name;item['image_sha256']=sha(image)
  entry['excerpts'].append(item)
 report['sources'].append(entry)
p=out/'cdc.html'
if not p.exists():subprocess.run(['curl','-fLsS','--max-time','90','https://www.cdc.gov/dental-infection-control/hcp/dental-ipc-faqs/occupational-exposure.html','-o',str(p)],check=True)
text=p.read_text();start=text.index('<p>If you have') if '<p>If you have' in text else text.index('What should you do if you have had an occupational exposure?')
# Retain the specific guidance section, not a navigation heading.
a=text.index('data-section="cdc_clinical_safety_best_practices_spec');b=text.index('</ul>',a)+5
excerpt=re.sub('<[^>]+>',' ',text[a:b]);excerpt=re.sub(r'\s+',' ',excerpt).strip();(out/'cdc-exposure-excerpt.txt').write_text(excerpt)
assert 'soap and water' in excerpt and 'Immediately seek medical evaluation' in excerpt
if expected:assert sha(out/'cdc-exposure-excerpt.txt')==next(x['excerpt_sha256'] for x in expected['sources'] if x['id']=='cdc'),'CDC checked excerpt changed'
report['sources'].append({'id':'cdc','url':'https://www.cdc.gov/dental-infection-control/hcp/dental-ipc-faqs/occupational-exposure.html','sha256':sha(p),'bytes':p.stat().st_size,'excerpt_file':'cdc-exposure-excerpt.txt','excerpt_sha256':sha(out/'cdc-exposure-excerpt.txt'),'text_inspected':True,'limitation':'US dental setting guidance; no hotline or dental procedural authority transferred to BHWs.'})
(root/'docs/lesson-184-source-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Retained primary-source hashes and inspected excerpts; clinical review pending.')

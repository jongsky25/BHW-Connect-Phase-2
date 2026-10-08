"""Retrieve originals through their established public URLs; private draft audit only."""
import pathlib,json,hashlib,subprocess,fitz,shutil
root=pathlib.Path(__file__).resolve().parent.parent;out=root/'.preview/lesson162-source';out.mkdir(parents=True,exist_ok=True)
audit=json.loads((root/'docs/lesson-162-source-audit.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources=[('reference','https://drive.google.com/uc?export=download&id=13auqmQNRLevwxTm3lkMRHX13U1_d0TYs',[18,19,30]),('facilitator','https://drive.google.com/uc?export=download&id=1FJNtduA8gDDDvW3WtNR5f-ai4f0izD0W',[28]),('deck','https://drive.google.com/uc?export=download&id=1ZDIJiTltEzJVFcy-XSA0NivWNvfAKfhY',list(range(52,58))),('tesda','https://www.tesda.gov.ph/Downloadables/Barangay%20Health%20Services%20NC%20II.pdf',[26,27,28])]
for name,url,pages in sources:
 file=out/(name+'-original.pdf' if name!='tesda' else 'tesda-bhs.pdf')
 if not file.exists():subprocess.run(['curl','-fsSL',url,'-o',str(file)],check=True)
 expected=next((s['sha256'] for s in audit['original_pdfs'] if s['file']==file.name),audit['tesda_verification']['file_sha256'] if name=='tesda' else None)
 assert sha(file)==expected,file
 doc=fitz.open(file)
 for n in pages:
  image=out/f'{name}-p{n}.png';doc[n-1].get_pixmap(dpi=110).save(str(image));(out/f'{name}-p{n}.txt').write_text(doc[n-1].get_text())
  expected_image=next(s['sha256'] for s in audit['original_page_images_inspected'] if s['file']==image.name)
  assert sha(image)==expected_image,image
print('Verified original PDFs and 13 audited page images; no public redistribution.')

import importlib.util
spec=importlib.util.spec_from_file_location('primary',root/'scripts/lesson-162-primary-passages.py');primary=importlib.util.module_from_spec(spec);spec.loader.exec_module(primary)
pinned=json.loads((root/'docs/lesson-162-primary-passages.json').read_text());receipt={}
for name,url in [('privacy-irr.html',audit['privacy_primary_source']['url']),('tesda-filter.html',audit['tesda_verification']['official_catalog_url'])]:
 file=out/name
 retrieval='existing inspected local copy'
 if not file.exists():
  result=subprocess.run(['curl','-fsSL','--retry','2','--retry-all-errors','--retry-delay','1',url,'-o',str(file)],check=False)
  if result.returncode==0:retrieval='fresh public retrieval'
  else:
   captured=root/('docs/lesson-162-'+name)
   assert sha(captured)==pinned[name]['authoring_raw_sha256'], 'Captured raw primary source hash mismatch'
   shutil.copyfile(captured,file);retrieval='captured 2026-10-08 inspected source; public retrieval unavailable (curl exit '+str(result.returncode)+')'
 text=primary.passages(name,file.read_text());canonical=primary.digest(text)
 assert canonical==pinned[name]['canonical_sha256'], 'Primary passage changed; inspect the target claim audit before packaging: '+name
 receipt[name]={'url':url,'raw_sha256':sha(file),'bytes':file.stat().st_size,'canonical_sha256':canonical,'matched_inspected_passage':True,'retrieval':retrieval}
(out/'primary-fetch-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Primary policy passages and current/superseded catalogue entries match; raw bytes and retrieval method retained.')

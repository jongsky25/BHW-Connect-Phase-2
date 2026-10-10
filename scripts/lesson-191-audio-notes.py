"""Expose every model concern without treating analysis as human listening or approval."""
import pathlib,json,re,hashlib
r=pathlib.Path('.');notes=[]
for suffix in ['audio-review','audio-focus']:
 p=r/f'docs/lesson-191-{suffix}.json';d=json.loads(p.read_text())
 for record in d['records']:
  for e in record.get('excerpts',[record]):
   raw=e.get('model_response') or '';clean=re.sub(r'^```(?:json)?\s*|\s*```$','',raw.strip())
   try:response=json.loads(clean)
   except json.JSONDecodeError:response={'unparsed_response':raw}
   concerns={k:v for k,v in response.items() if k in ['pronunciation_concerns','other_concerns','possible_defects','uncertainty','clipped_ending','unparsed_response'] and v not in [None,False,[],{},'','none','None']}
   if concerns or not raw:notes.append({'report':p.as_posix(),'record':record['id'],'kind':e.get('kind','full'),'source_sha256':record.get('source_sha256',record.get('sha256')),'excerpt_sha256':e.get('excerpt_sha256'),'response_sha256':hashlib.sha256(raw.encode()).hexdigest(),'concerns':concerns,'provider_failure':e.get('review_failure')})
report={'status':'model concerns exposed; human listening and exact draft approval pending','human_listening':{'status':'not performed','required_recordings':14,'scope':'all 12 Read tracks and both shipped AAC story tracks, plus indicated excerpts'},'interpretation':['A single screen is not expected to recite the entire lesson: cross-topic omission claims must be checked against the relevant screens, not taken as defects by themselves.','Possible voice shifts, articulation variants, textual substitutions and ending defects remain listening questions. Model transcripts and competing reports do not establish pronunciation or narrator consistency.','No speech alias was introduced. Displayed and spoken name remains Charlaine.','Reused model reports describe only their exact-byte or decoded-PCM match; all retained initial failures remain separately available.'],'owner_approval':False,'facility_infection_prevention_review':'pending','findings':notes}
(r/'docs/lesson-191-audio-review-notes.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('Recorded',len(notes),'model concern/uncertainty entries; no human approval claimed.')

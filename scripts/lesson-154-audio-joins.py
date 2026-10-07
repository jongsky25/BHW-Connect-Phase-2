import pathlib,json,hashlib
r=pathlib.Path(__file__).resolve().parents[1];raw=r/'.preview/lesson154-raw';sha=lambda b:hashlib.sha256(b).hexdigest();items=[]
for f in sorted(raw.glob('*.json')):
 d=json.loads(f.read_text());request=d.get('request');body=d.get('response_body')
 request_bytes=json.dumps(request,separators=(',',':'),ensure_ascii=False).encode()
 if d.get('request_sha256'):assert d['request_sha256']==sha(request_bytes),str(f)
 if body is not None:assert d['response_sha256']==sha(body.encode()),str(f)
 try:parsed=json.loads(body) if body else {}
 except json.JSONDecodeError:parsed={}
 response_text='\n'.join(c.get('text','') for step in parsed.get('steps',[]) if step.get('type')=='model_output' for c in step.get('content',[]) if c.get('type')=='text')
 for a in request.get('input',[]) if isinstance(request,dict) else []:
  if a.get('type')=='audio':
   import base64
   items.append({'audio_sha256':sha(base64.b64decode(a['data'])),'request_sha256':sha(request_bytes),'response_sha256':sha(body.encode()) if body is not None else None,'raw_file':str(f.relative_to(r)),'raw_sha256':sha(f.read_bytes()),'status':d.get('response_status'),'response_text':response_text})
full=json.loads((r/'docs/lesson-154-audio-review.json').read_text());focused=json.loads((r/'docs/lesson-154-audio-focus.json').read_text());joins=[]
for rec in full['records']:
 matched=[x for x in items if x['audio_sha256']==rec['sha256'] and x['status']==200 and x['response_text']==rec['model_response']]
 assert matched,rec['id'];joins.append({'review':rec['id'],'kind':'full','audio_sha256':rec['sha256'],'exchanges':[{k:v for k,v in x.items() if k!='response_text'} for x in matched]})
for rec in focused['records']:
 for e in rec['excerpts']:
  matched=[x for x in items if x['audio_sha256']==e['excerpt_sha256'] and x['status']==200 and x['response_text']==e['model_response']]
  assert matched,(rec['id'],e['kind']);joins.append({'review':rec['id'],'kind':e['kind'],'audio_sha256':e['excerpt_sha256'],'exchanges':[{k:v for k,v in x.items() if k!='response_text'} for x in matched]})
assert len(full['records'])==14 and len(focused['records'])==14 and len(joins)==70
report={'status':'passed','raw_exchange_files':len(list(raw.glob('*.json'))),'full_reviews':len(full['records']),'focused_reviews':sum(len(r['excerpts']) for r in focused['records']),'joins':joins,'limitation':'Model-mediated reviews are not human listening, policy SME signoff or owner approval.'}
(r/'docs/lesson-154-audio-joins.json').write_text(json.dumps(report,indent=2)+'\n');print({k:v for k,v in report.items() if k!='joins'})

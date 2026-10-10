"""Exact media/ZIP integrity for the bilingual review draft; no release approval."""
import pathlib,json,hashlib,zipfile,base64,subprocess
root=pathlib.Path('.');out=root/'.preview/lesson193-deliverables';html=out/'lesson-1.9.3-charlaine-review.html';assert html.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
receipts=json.loads((out/'lesson-193-inline-media.json').read_text());text=html.read_text()
for p,v in receipts.items():
 b=(root/'public'/p.lstrip('/')).read_bytes();assert len(b)==v['bytes'] and sha(b)==v['sha256'] and base64.b64encode(b).decode() in text,p
registry=json.loads((root/'docs/lesson-193-registry.json').read_text())
registry_check=json.loads((root/'docs/lesson-193-registry-verification.json').read_text())
assert registry['status']=='every composition rendered' and not registry['failures']
assert registry_check['all_metadata_match'] and registry_check['actual_compositions']==registry['registry_count']==len(registry['rendered'])
assert registry_check['ids_in_order']==registry['ids_in_order']
assert registry_check['registry_report_sha256']==sha((root/'docs/lesson-193-registry.json').read_bytes())
assert registry_check['registry_source_sha256']==sha((root/'remotion/src/Root.tsx').read_bytes())
assert registry_check['source_commit']==subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
commit=(root/'docs/lesson-193-frozen-git-commit.txt').read_bytes()
assert hashlib.sha1(b'commit '+str(len(commit)).encode()+b'\0'+commit).hexdigest()==registry_check['source_commit']
browser=json.loads((out/'lesson-193-browser-verification.json').read_text())
assert browser['source_commit']==registry_check['source_commit'] and browser['html_sha256']==sha(html.read_bytes())
assert browser['actual_case_count']==len(browser['cases'])==96 and browser['actual_screenshot_count']==len(browser['screenshots'])==88
assert not browser['errors'] and not browser['network_failures'] and not browser['missing']
assert browser['status'].startswith('passed for actual component/media fixture scope')
for name in browser['screenshots']:assert (out/name).is_file() and (out/name).stat().st_size>0
prints=json.loads((out/'lesson-193-print-verification.json').read_text())
assert len(prints)==4
for p in prints:
 b=(out/p['file']).read_bytes();assert sha(b)==p['sha256'] and len(b)==p['bytes']
 assert p['pages']==(5 if 'print-kit' in p['file'] else 1) and p['A4'] and p['text_inside_margins']
manifest=json.loads((root/'content/training/day1-basic-competencies/narration.json').read_text())
full=json.loads((root/'docs/lesson-193-audio-review.json').read_text());focus=json.loads((root/'docs/lesson-193-audio-focus.json').read_text())
assert len(full['records'])==16 and len(focus['records'])==16
anchors=['trial','compare','communicate','workload','handover','practice','check']
assert {r['id'] for r in full['records']}=={f'read-resources-monitor-{a}-{l}' for a in anchors for l in ['fil','en']}|{'story-fil','story-en'}
assert {r['id'] for r in focus['records']}=={f'read-{a}-{l}' for a in anchors for l in ['fil','en']}|{'shipped-story-fil','shipped-story-en'}
decode=json.loads((root/'docs/lesson-193-audio-decode.json').read_text())
assert len(decode['records'])==16
for r in focus['records']:
 actual=next(d for d in decode['records'] if d['id']==r['id'])
 assert r['source_sha256']==actual['source_sha256'] and r['decoded_pcm_sha256']==actual['decoded_pcm_sha256']
 assert [(e['kind'],e['excerpt_sha256']) for e in r['excerpts']]==[(e['kind'],e['excerpt_sha256']) for e in actual['excerpts']]

def pcm_hash(wav):
 assert wav[:4]==b'RIFF' and wav[8:12]==b'WAVE'
 offset=12;fmt=None
 while offset+8<=len(wav):
  kind=wav[offset:offset+4];size=int.from_bytes(wav[offset+4:offset+8],'little');start=offset+8
  if kind==b'fmt ':fmt=[int.from_bytes(wav[start+i:start+i+n],'little') for i,n in [(0,2),(2,2),(4,4),(14,2)]]
  if kind==b'data':assert fmt==[1,1,24000,16];return sha(wav[start:start+size])
  offset=start+size+(size%2)
 raise AssertionError('Missing PCM chunk')
for record in full['records']:
 if record['id'].startswith('story-'):
  media=root/f"remotion/public/resources-monitor/shipped-aac-{record['language']}.wav"
  assert sha((root/'public'/record['source_video'].lstrip('/')).read_bytes())==record['source_video_sha256']
 else:
  section,language=record['id'].removeprefix('read-resources-monitor-').rsplit('-',1)
  media=root/'public'/manifest['lessons']['resources-monitor']['sections'][section][language]['src'].lstrip('/')
 assert sha(media.read_bytes())==record['sha256'],record['id']
 if record['id'].startswith('story-'):assert pcm_hash(media.read_bytes())==next(r['decoded_pcm_sha256'] for r in decode['records'] if r['id']=='shipped-'+record['id'])
assert sum(len(r['excerpts']) for r in focus['records'])==64
assert all(r.get('model_response','').strip() and not r['model_response'].startswith('Review unavailable') for r in full['records'])
assert all(e.get('model_response','').strip() and not e.get('review_failure') for r in focus['records'] for e in r['excerpts'])
for record in focus['records']:
 assert sha((root/'public'/record['source_path'].lstrip('/')).read_bytes())==record['source_sha256']
 for excerpt in record['excerpts']:
  assert sha((root/'.preview/lesson193-excerpts'/excerpt['file']).read_bytes())==excerpt['excerpt_sha256']
# Bind every model assessment to the exact audio supplied in its retained raw request.
raw_index={}
def output_text(v):
 if isinstance(v,str):return v
 if isinstance(v,list):return '\n'.join(t for t in map(output_text,v) if t)
 if not isinstance(v,dict):return ''
 if isinstance(v.get('output_text'),str):return v['output_text']
 if v.get('type')=='text' and isinstance(v.get('text'),str):return v['text']
 return output_text(v.get('outputs',v.get('output',v.get('content',[step for step in v.get('steps',[]) if step.get('type')=='model_output']))))
for p in (root/'.preview/lesson193-raw').glob('*.json'):
 raw=json.loads(p.read_text())
 if raw.get('response_sha256'):assert sha(raw['response_body'].encode())==raw['response_sha256']
 try:answer=output_text(json.loads(raw.get('response_body') or '{}'))
 except json.JSONDecodeError:continue
 for part in (raw.get('request') or {}).get('input',[]):
  if part.get('type')=='audio' and part.get('data') and answer:raw_index[(sha(base64.b64decode(part['data'])),answer.strip())]=p.as_posix()
for r in full['records']:assert (r['sha256'],r['model_response'].strip()) in raw_index,('Raw full-review binding absent',r['id'])
for r in focus['records']:
 for e in r['excerpts']:assert (e['excerpt_sha256'],e['model_response'].strip()) in raw_index,('Raw focused-review binding absent',r['id'],e['kind'])
for name,receipt in json.loads((root/'docs/lesson-193-source-excerpts/integrity.json').read_text()).items():
 b=(root/'.preview/lesson193-source'/name).read_bytes();assert len(b)==receipt['bytes'] and sha(b)==receipt['sha256']
paths=set()
for pattern in ['docs/lesson-193-*','docs/lesson-19-charlaine-*','docs/lesson-193-source-excerpts/*','scripts/lesson-193-*','scripts/remotion-resources-monitor-narrate.mjs','scripts/lib/lesson-193-integration.mjs','scripts/tests/lesson-193.test.mjs','.github/workflows/lesson193-*.yml','content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/*','public/training/audio/09-sustainable-practices/resources-monitor/*','public/training/bhw-1-9/charlaine-monitor-*','public/training/bhw-1-9/charlaine-reference-*','public/training/bhw-1-9/resources-monitor-*','public/training/module-1-9/monitor-c5d2eff5ad98.svg','remotion/src/resources-monitor/*','remotion/public/resources-monitor/*','.preview/lesson193-source/*.txt','.preview/lesson193-source/*.png','.preview/lesson193-raw/*.json','.preview/lesson193-excerpts/*','.preview/lesson193-decoded/*','.preview/lesson193-superseded/*','.preview/lesson193-deliverables/*.json','.preview/lesson193-deliverables/*.log','.preview/lesson193-deliverables/*.png','.preview/lesson193-deliverables/*.pdf','.preview/lesson193-deliverables/*.html']:
 paths.update(p for p in root.glob(pattern) if p.is_file())
for p in ['content/training/day1-basic-competencies/narration.json','remotion/src/Root.tsx','src/components/elearning/reference-lessons.tsx','scripts/lib/lesson-192-integration.mjs','scripts/tests/lesson-192-release.test.mjs','docs/lesson-192-proposal-receipt.json','docs/lesson-192-owner-approval.json','scripts/lib/lesson-191-integration.mjs','scripts/tests/lesson-191-release.test.mjs','docs/lesson-191-proposal-receipt.json','docs/lesson-191-owner-approval.json']:paths.add(root/p)
if (root/'lesson-193-published-snapshot.json').exists():paths.add(root/'lesson-193-published-snapshot.json')
paths.discard(out/'lesson-193-package-integrity.json')
status=json.loads((root/'docs/lesson-193-execution-status.json').read_text())
report={'status':'verified draft archive integrity; review states remain separate','source_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'owner_release_approval':False,'pending_reviews':status.get('pending',[]),'inline_media_exact_matches':len(receipts),'files':[]}
target=out/'lesson-1.9.3-charlaine-draft-review.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(paths):
  name=p.as_posix();assert not name.startswith('/') and '..' not in p.parts and chr(92) not in name
  b=p.read_bytes();z.writestr(name,b);report['files'].append({'member':name,'bytes':len(b),'sha256':sha(b)})
with zipfile.ZipFile(target) as z:
 assert len(z.namelist())==len(set(z.namelist()));assert z.testzip() is None
 for f in report['files']:
  b=z.read(f['member']);assert len(b)==f['bytes'] and sha(b)==f['sha256']
assert target.stat().st_size<512*1024*1024
report.update(zip_bytes=target.stat().st_size,zip_sha256=sha(target.read_bytes()),safe_unique_paths=True,CRC_checked=True)
(out/'lesson-193-package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified draft ZIP',len(paths),'members;',len(receipts),'exact inline media matches;',target.stat().st_size,'bytes')

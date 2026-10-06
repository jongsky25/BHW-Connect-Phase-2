#!/usr/bin/env python3
"""Verify target media, all-slide artwork, and creation-time protected bytes."""
import hashlib,json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parent.parent
lesson_path=root/'content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-local-partners/lesson.json'
lesson=json.loads(lesson_path.read_text())
slides=json.loads((lesson_path.parent/'slides.json').read_text())
manifest=json.loads((root/'content/training/day1-basic-competencies/narration.json').read_text())
base=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else root.parent/'handoff-input/verified/baseline.json'
assert base.exists(),'verified creation baseline required'
b=json.loads(base.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert len(slides)==len(lesson['sections'])==6
assert set(s['id'] for s in lesson['sections'])>=set(('section-6','section-7'))
assert set(s['id'] for s in slides)>=set(('slide-section-6','slide-section-7'))
for s,slide in zip(lesson['sections'],slides):
 assert slide['id']=='slide-'+s['id'] and len(slide['asset_ids'])==2
 for lang in ('fil','en'):
  assert slide['narration_'+lang]==s['body_'+lang]
 for id in slide['asset_ids']:
  asset=next(a for a in lesson['assets'] if a['id']==id)
  assert sha(root/'public'/asset['path'].lstrip('/'))==asset['content_hash']
  assert asset['review_status']=='draft'
assert len(set(s['asset_ids'][1] for s in slides))==6
assert all('malou-local-coordination' in s['asset_ids'] for s in slides)
protected={**b['same_module_protected_hashes'],**b['starting_public_mp3_hashes']}
assert all(sha(root/p)==digest for p,digest in protected.items())
assert all(sha(root/'public'/a['path'].lstrip('/'))==a['sha256'] for a in b['approved_protected_media'])
assert b['narration_manifest']['lessons']['bhw-local-partners'] in manifest['history']['bhw-local-partners']
tracks=manifest['lessons']['bhw-local-partners']['sections'];assert len(tracks)==6
for s in lesson['sections']:
 for lang in ('fil','en'):
  t=tracks[s['id']][lang]
  assert t['voice']=='gemini:gemini-3.8-flash-tts:Kore'
  assert sha(root/'public'/t['src'].lstrip('/'))==t['sha256']
  assert t['duration_seconds']>0 and t['timings'][-1]['end_ms']<=t['duration_seconds']*1000+10
story=next(a for a in lesson['assets'] if a['id']=='bhw-local-partners-story')
assert story['review_status']=='draft'
for lang in ('fil','en'):
 v=story['videos'][lang]
 for x in (v,v['poster'],v['captions']):assert sha(root/'public'/x['path'].lstrip('/'))==x['content_hash']
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(root/'public'/v['path'].lstrip('/'))]))
 assert any(s['codec_name']=='h264' for s in info['streams'])
 assert any(s['codec_name']=='aac' for s in info['streams'])
 captions=(root/'public'/v['captions']['path'].lstrip('/')).read_text()
 assert captions.startswith('WEBVTT') and captions.count('-->')==6
for name in ('audio-review','audio-focus'):
 report=json.loads((root/f'docs/lesson-153-{name}.json').read_text());assert len(report['records'])==14
 if name=='audio-review':
  for x in report['records']:
   assert x['raw_request'] and x['raw_response'] and x['http_status']==200
   assert hashlib.sha256(x['raw_request'].encode()).hexdigest()==x['request_sha256']
   assert hashlib.sha256(x['raw_response'].encode()).hexdigest()==x['response_sha256']
 else:
  for x in report['records']:
   assert x['full_audio_metrics']['rms']>0.002
   assert all(y['raw_request'] and y['raw_response'] for y in x['excerpts'])
output={'lesson':'1.5.3','status':'draft verification passed','source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'screens':6,'images_per_slide':2,'unique_visual_cues':6,'new_read_tracks':12,'story_videos':2,'captions_per_language':6,'full_model_reviews':14,'protected_sibling_sources':len(b['same_module_protected_hashes']),'protected_starting_mp3':len(b['starting_public_mp3_hashes']),'protected_approved_media':len(b['approved_protected_media']),'original_source_pdf_review':'unavailable; inherited leads disclosed'}
out=root/'.preview/lesson-153';out.mkdir(parents=True,exist_ok=True)
(out/'lesson-1.5.3-verification.json').write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps(output,indent=2))

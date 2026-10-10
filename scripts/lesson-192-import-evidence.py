"""Import actual workflow media without replacing sibling lessons or audit history.
Usage: python3 scripts/lesson-192-import-evidence.py READ_DIRECTORY STORY_DIRECTORY
"""
import pathlib, json, shutil, sys, hashlib
root=pathlib.Path(__file__).resolve().parent.parent
read, story=map(pathlib.Path,sys.argv[1:])
j=lambda p:json.loads(p.read_text())
write=lambda p,v:p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def copy(p,d):
 d.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,d)
# Keep every superseded review and its original focused WAVs.
saved=root/'.preview/lesson192-superseded/initial-read'
for pattern in ['docs/lesson-192-audio-*.json','.preview/lesson192-excerpts/*']:
 for p in root.glob(pattern):
  if p.is_file():copy(p,saved/p.relative_to(root))
for source in [read,story]:
 for pattern in ['public/training/audio/09-sustainable-practices/resources-safe-change/*','public/training/bhw-1-9/resources-safe-change-*','remotion/public/resources-safe-change/narration-*','remotion/public/resources-safe-change/shipped-aac-*','.preview/lesson192-raw/*','.preview/lesson192-excerpts/*']:
  for p in source.glob(pattern):
   if p.is_file():copy(p,root/p.relative_to(source))
 for name in ['media-generation','story-generation']:
  p=source/f'docs/lesson-192-{name}.json'
  if p.exists():copy(p,root/p.relative_to(source))
p=pathlib.Path('content/training/day1-basic-competencies/narration.json')
current,incoming=j(root/p),j(read/p)
for key,value in current['lessons'].items():
 if key!='resources-safe-change':assert incoming['lessons'][key]==value,key
for key,value in current.get('history',{}).items():
 if key!='resources-safe-change':assert incoming.get('history',{})[key]==value,key
current['lessons']['resources-safe-change']=incoming['lessons']['resources-safe-change']
current.setdefault('history',{})['resources-safe-change']=incoming['history']['resources-safe-change']
write(root/p,current)
p=pathlib.Path('content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-safe-change/lesson.json')
current,incoming=j(root/p),j(story/p)
asset=next(a for a in incoming['assets'] if a['id']=='resources-safe-change-story')
current['assets']=[a for a in current['assets'] if a['id']!=asset['id']]+[asset]
current['featured_asset_id']=asset['id'];write(root/p,current)
full=j(read/'docs/lesson-192-audio-review.json');full['records']+=j(story/'docs/lesson-192-audio-review.json')['records']
assert len(full['records'])==14 and not full['pending_read_tracks']
full['evidence_source_commits']=[j(s/'docs/lesson-192-audio-review.json')['source_commit'] for s in [read,story]]
write(root/'docs/lesson-192-audio-review.json',full)
focus=j(read/'docs/lesson-192-audio-focus.json');focus['records']+=j(story/'docs/lesson-192-audio-focus.json')['records']
focus.update(actual_recordings=14,actual_focused_excerpts=56,missing_story=False,successful_model_reviews=sum(bool(e.get('model_response')) for r in focus['records'] for e in r['excerpts']))
assert len(focus['records'])==14 and sum(len(r['excerpts']) for r in focus['records'])==56
focus['provider_failures']=sum(bool(e.get('review_failure')) for r in focus['records'] for e in r['excerpts'])
write(root/'docs/lesson-192-audio-focus.json',focus)
print('Imported only target media and combined 14 full / 56 focused actual-byte reviews.')

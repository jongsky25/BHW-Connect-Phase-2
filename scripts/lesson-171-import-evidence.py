"""Import only actual target media from the pinned generation archive."""
import pathlib,json,zipfile,hashlib,subprocess
r=pathlib.Path('.');origins=json.loads((r/'docs/lesson-171-evidence-origins.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest();save=lambda p,v:p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');current_base=json.loads((r/'docs/lesson-171-baseline.json').read_text());base=json.loads(subprocess.check_output(['git','show',origins['generation_commit']+':docs/lesson-171-baseline.json']));leaf=r/'content/training/day1-basic-competencies/modules/07-problema/lessons/problem-define'
for origin in origins['archives']:
 archive=r/'.preview'/origin['local_archive'];assert sha(archive.read_bytes())==origin['zip_sha256']
 with zipfile.ZipFile(archive) as z:
  names=z.namelist();assert len(names)==len(set(names)) and z.testzip() is None
  for name in names:
   p=pathlib.PurePosixPath(name);assert not p.is_absolute() and '..' not in p.parts and '\\' not in name
  manifest=json.loads(z.read('content/training/day1-basic-competencies/narration.json'))
  for k,v in base['narration']['lessons'].items():
   if k!='problem-define':assert manifest['lessons'][k]==v,k
  for k,v in base['narration'].get('history',{}).items():assert (manifest['history'][k][:len(v)] if k=='problem-define' else manifest['history'][k])==v
  assert base['narration']['lessons']['problem-define'] in manifest['history']['problem-define']
  merged=current_base['narration'];merged['lessons']['problem-define']=manifest['lessons']['problem-define'];merged.setdefault('history',{})['problem-define']=manifest['history']['problem-define'];manifest=merged
  save(r/'content/training/day1-basic-competencies/narration.json',manifest)
  generated=json.loads(z.read(str(leaf/'lesson.json')));current=json.loads((leaf/'lesson.json').read_text());assert generated['manifest']==current['manifest']==base['manifest'];story=next(a for a in generated['assets'] if a['id']=='problem-define-story');current['assets']=[a for a in current['assets'] if a['id']!='problem-define-story']+[story];current['featured_asset_id']=story['id'];save(leaf/'lesson.json',current)
  for name in names:
   if name.endswith('/'):continue
   if not (name.startswith(('public/training/audio/07-problema/problem-define/','public/training/bhw-1-7/problem-define-','remotion/public/problem-define/narration-','remotion/public/problem-define/shipped-aac-','.preview/lesson171-raw/','.preview/lesson171-excerpts/','docs/lesson-171-audio-')) or name in ['docs/lesson-171-media-generation.json','lesson-171-published-snapshot.json']):continue
   p=r/name;data=z.read(name);p.parent.mkdir(parents=True,exist_ok=True)
   if p.exists() and name.startswith('public/'):assert p.read_bytes()==data,'Never overwrite hashed public media: '+name
   else:p.write_bytes(data)
# Use measured actual Read duration; retain current source-audited guide text.
import re
seconds={l:sum(v[l]['duration_seconds'] for v in manifest['lessons']['problem-define']['sections'].values()) for l in ['fil','en']};low=__import__('math').ceil(max(seconds.values())/60+3)
for lang in ['fil','en']:
 p=leaf/f'facilitator.{lang}.md';text=p.read_text();estimate=(f"Authored independent estimate: {low}–{low+3} minutes, using the longer language track. Actual six-screen narration: English {seconds['en']:.2f} seconds; Filipino {seconds['fil']:.2f} seconds. Allow 3–6 minutes for the check, rehearsal and reflection." if lang=='en' else f"Ginawang pagtataya ng sariling pag-aaral: {low}–{low+3} minuto, ayon sa mas mahabang salaysay. Aktuwal na anim na screen: English {seconds['en']:.2f} segundo; Filipino {seconds['fil']:.2f} segundo. Maglaan ng 3–6 minuto para sa check, ensayo at pagninilay.")
 text=re.sub(r'SELF_STUDY_TIMING_PENDING|Authored independent estimate:[^\n]+|Ginawang pagtataya ng sariling pag-aaral:[^\n]+',estimate,text);p.write_text(text)
print('Imported actual target audio/story/review bytes, preserved local source audit and every predecessor public byte.')

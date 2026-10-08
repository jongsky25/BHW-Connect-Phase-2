"""Import generated target media/evidence from a pinned Actions ZIP. Dry-run by default."""
import argparse,pathlib,zipfile,json,hashlib,re,subprocess
p=argparse.ArgumentParser();p.add_argument('archive');p.add_argument('--artifact-id',type=int,required=True);p.add_argument('--run-id',type=int,required=True);p.add_argument('--apply',action='store_true');a=p.parse_args()
r=pathlib.Path(__file__).resolve().parent.parent;archive=pathlib.Path(a.archive);digest=hashlib.sha256(archive.read_bytes()).hexdigest();leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/'
allowed_exact={'content/training/day1-basic-competencies/narration.json',leaf+'lesson.json',leaf+'facilitator.fil.md',leaf+'facilitator.en.md','lesson-163-published-snapshot.json'}
allowed_patterns=[r'docs/lesson-163-(media-generation|audio-review|audio-focus|audio-decode|decoded-media-check)\.json',r'remotion/public/communication-explain/narration-(fil|en)\.(mp3|json)',r'public/training/audio/06-komunikasyon/communication-explain/[^/]+\.mp3',r'public/training/bhw-1-6/communication-explain-[^/]+\.(mp4|vtt|jpg)',r'\.preview/lesson163-(raw|decoded|excerpts|source|deliverables)/.+']
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None,'CRC failure';names=z.namelist();assert len(names)==len(set(names)),'Duplicate members'
 selected=[]
 for name in names:
  q=pathlib.PurePosixPath(name);assert not q.is_absolute() and '..' not in q.parts and chr(92) not in name,'Unsafe member'
  if name.endswith('/'):continue
  if name in allowed_exact or any(re.fullmatch(pattern,name) for pattern in allowed_patterns):
   data=z.read(name);dest=r/name
   if name.startswith('public/') and dest.exists():assert dest.read_bytes()==data,'Immutable public bytes differ: '+name
   selected.append((name,data))
 print('Verified archive',digest,'safe target members',len(selected),'apply',a.apply)
 if a.apply:
  for name,data in selected:
   dest=r/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
  pin={'artifact_id':a.artifact_id,'run_id':a.run_id,'archive_sha256':digest,'artifact_name':'lesson163-generated-evidence','method':'Safe unique ZIP members and CRC checked; only target media, target generated metadata, bounded snapshot and local evidence imported. Existing immutable public files cannot be replaced.'}
  (r/'docs/lesson-163-evidence-cache.json').write_text(json.dumps(pin,indent=2)+'\n')
  subprocess.run(['node','scripts/lesson-163-preserve-opening.mjs'],cwd=r,check=True)
  subprocess.run(['node','scripts/lesson-163-preservation.mjs'],cwd=r,check=True)
  subprocess.run(['node','scripts/lesson-163-pin-proposal.mjs'],cwd=r,check=True)

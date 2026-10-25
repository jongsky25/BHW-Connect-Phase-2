#!/usr/bin/env python3
"""Assemble approved Read recordings/illustrations; no TTS or authored words.
The five teaching sections are included. The final check/answer recording is
excluded. Existing approved narration, images and source files are read only.
"""
import hashlib,json,pathlib,subprocess,tempfile,wave,concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[1]
KEY='problem-prioritize'
ORDER=['criteria','worked-scores','score-evidence','tie-and-urgent-care','practice']
EXPECTED='ca5834ca03409c356d8f4b0b9d2a3187db7d3753f16e58cdaa24e2863c77c5f9'
LEAF=ROOT/'content/training/day1-basic-competencies/modules/07-problema/lessons'/KEY
manifest=json.loads((ROOT/'content/training/day1-basic-competencies/narration.json').read_text())
lesson=json.loads((LEAF/'lesson.json').read_text())
approved=json.loads((ROOT/'docs/lesson-173-narration-approval.json').read_text())
assets=[next(a for a in lesson['assets'] if a['id']=='prioritize-'+sid) for sid in ORDER]
for a in assets:
 assert a['review_status']=='approved'
 assert hashlib.sha256((ROOT/('public'+a['path'])).read_bytes()).hexdigest()==a['content_hash']
def run(args):return subprocess.check_output(args,stderr=subprocess.DEVNULL)
def probe(p):return json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def stamp(ms):
 ms=round(ms);s,ms=divmod(ms,1000);m,s=divmod(s,60);h,m=divmod(m,60)
 return f'{h:02}:{m:02}:{s:02}.{ms:03}'
def build(lang):
 with tempfile.TemporaryDirectory(prefix='bhw-prioritize-') as temp:
  temp=pathlib.Path(temp);pcm=[];clips=[];offset=0;cues=[]
  for i,(sid,a) in enumerate(zip(ORDER,assets)):
   track=manifest['lessons'][KEY]['sections'][sid][lang];mp3=ROOT/('public'+track['src']);assert sha(mp3)==track['sha256'];assert approved['tracks']['public'+track['src']]['sha256']==track['sha256']
   wav=temp/f'{i}.wav';run(['ffmpeg','-v','error','-y','-i',str(mp3),'-ar','24000','-ac','1','-c:a','pcm_s16le',str(wav)])
   with wave.open(str(wav),'rb') as w:
    assert w.getframerate()==24000 and w.getnchannels()==1 and w.getsampwidth()==2
    frames=w.readframes(w.getnframes());duration=len(frames)/48000
   pcm.append(frames)
   for t in track['timings']:
    assert t['end_ms']<=duration*1000+100
    cues.append(f'{len(cues)+1}\n{stamp(offset*1000+t["start_ms"])} --> {stamp(min((offset+duration)*1000,offset*1000+t["end_ms"]))}\n{t["text"].replace("**","")}')
   clips.append({'section_id':sid,'asset_id':a['id'],'image_path':a['path'],'image_sha256':a['content_hash'],'src':track['src'],'sha256':track['sha256'],'start_seconds':offset,'duration_seconds':duration})
   offset+=duration
  combined=temp/'lesson.wav'
  with wave.open(str(combined),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(b''.join(pcm))
  timeline=temp/'images.ffconcat';lines=['ffconcat version 1.0']
  for clip in clips:lines.extend(["file '"+str(ROOT/('public'+clip['image_path']))+"'",f'duration {clip["duration_seconds"]:.9f}'])
  lines.append("file '"+str(ROOT/('public'+clips[-1]['image_path']))+"'")
  timeline.write_text('\n'.join(lines)+'\n')
  out=temp/'lesson.mp4'
  run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(timeline),'-i',str(combined),'-vf','scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2:color=0x161616,setsar=1,fps=12','-t',str(offset),'-c:v','libx264','-preset','veryfast','-tune','stillimage','-crf','28','-pix_fmt','yuv420p','-threads','2','-c:a','aac','-b:a','64k','-ar','24000','-ac','1','-movflags','+faststart',str(out)])
  info=probe(out);assert {s['codec_name'] for s in info['streams']}=={'h264','aac'}
  vtt=('WEBVTT\n\n'+'\n\n'.join(cues)+'\n').encode()
  media=ROOT/'public/training/narrated-lessons/problem-prioritize';media.mkdir(parents=True,exist_ok=True);video_path=media/f'prioritize-illustrated-{lang}-{sha(out)[:12]}.mp4';video_path.write_bytes(out.read_bytes())
  caption_path=media/f'prioritize-illustrated-{lang}-{hashlib.sha256(vtt).hexdigest()[:12]}.vtt';caption_path.write_bytes(vtt)
  print(json.dumps({'language':lang,'video_bytes':video_path.stat().st_size,'seconds':float(info['format']['duration']),'caption_cues':len(cues)}),flush=True)
  return lang,{'video':{'path':'/'+str(video_path.relative_to(ROOT/'public')),'content_hash':sha(video_path),'duration_s':float(info['format']['duration']),'poster':{'path':assets[0]['path'],'content_hash':assets[0]['content_hash']},'captions':{'path':'/'+str(caption_path.relative_to(ROOT/'public')),'content_hash':sha(caption_path)}},'clips':clips,'audio_pcm_sha256':hashlib.sha256(b''.join(pcm)).hexdigest()}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:languages=dict(pool.map(build,['fil','en']))
 data={'lesson_key':KEY,'content_hash':EXPECTED,'sections':ORDER,'assets':[{k:a[k] for k in ['id','path','content_hash']} for a in assets],'languages':languages}
 target=ROOT/'src/lib/elearning/prioritization-narrated-lesson.json';target.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')

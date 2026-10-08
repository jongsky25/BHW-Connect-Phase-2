"""Check shipped format, measured ending/post-roll and poster versus final frame."""
import pathlib,json,subprocess,hashlib,fitz
r=pathlib.Path('.');out=r/'.preview/lesson162-deliverables';out.mkdir(parents=True,exist_ok=True)
lesson=json.loads((r/'content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify/lesson.json').read_text());story=next(a for a in lesson['assets'] if a['id']=='communication-clarify-story');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();records=[]
for lang in ['fil','en']:
 v=story['videos'][lang];movie=r/'public'/v['path'].lstrip('/');poster=r/'public'/v['poster']['path'].lstrip('/');timing=json.loads((r/f'remotion/public/communication-clarify/narration-{lang}.json').read_text())
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(movie)]))
 video=next(s for s in info['streams'] if s['codec_type']=='video');audio=next(s for s in info['streams'] if s['codec_type']=='audio')
 assert video['codec_name']=='h264' and audio['codec_name']=='aac'
 assert video['width']==854 and video['height']==480 and video['pix_fmt']=='yuv420p'
 duration=float(video['duration']);assert abs(duration-timing['durationSeconds']-1.1)<0.12 and duration<=90
 assert timing['beats'][-1]['end_ms']/1000<=duration-0.95
 frame=out/f'story-final-frame-{lang}.png'
 subprocess.run(['ffmpeg','-v','error','-sseof','-0.15','-i',str(movie),'-frames:v','1','-y',str(frame)],check=True)
 actual=fitz.Pixmap(str(frame));reference=fitz.Pixmap(str(poster));assert actual.width==reference.width==854 and actual.height==reference.height==480
 assert actual.n==reference.n==3
 diff=sum(abs(a-b) for a,b in zip(actual.samples,reference.samples))/len(actual.samples)
 assert diff<15,('Poster is inconsistent with decoded final frame',lang,diff)
 records.append({'language':lang,'video_sha256':sha(movie),'poster_sha256':sha(poster),'decoded_final_frame_sha256':sha(frame),'poster_final_frame_mean_absolute_RGB_difference':diff,'video_codec':video['codec_name'],'audio_codec':audio['codec_name'],'width':854,'height':480,'pixel_format':video['pix_fmt'],'actual_duration_seconds':duration,'narration_seconds':timing['durationSeconds'],'ending_post_roll_seconds':duration-timing['beats'][-1]['end_ms']/1000,'caption_beats':len(timing['beats'])})
report={'status':'passed','source_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'method':'ffprobe actual H.264/AAC streams, measured narration/caption ending and decoded final frame versus shipped poster; no human listening claim','records':records}
(out/'lesson-162-video-verification.json').write_text(json.dumps(report,indent=2)+'\n');print('Verified both shipped stories, ending post-roll and final-frame posters.')

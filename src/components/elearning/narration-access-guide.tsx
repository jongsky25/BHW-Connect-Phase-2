import {timingsMatchSection} from '@/lib/elearning/narration-zones';
import type {LessonNarration} from '@/lib/elearning/reference-narration';
import type {PublishedLesson} from '@/lib/elearning/reference-navigation';

const reviewed={
  'bhw-legal-role':{hash:'7a4880da236ea31a78647bb447ba6ff66eb7be701eb442059c3fabf77eddc57e',first:'section-1'},
  'problem-prioritize':{hash:'ca5834ca03409c356d8f4b0b9d2a3187db7d3753f16e58cdaa24e2863c77c5f9',first:'criteria'},
};
export function NarrationAccessGuide({lesson,position,narration,en,slides,translated,illustrated}:{
  lesson:PublishedLesson;position:string;narration?:LessonNarration;en:boolean;slides:boolean;translated:boolean;illustrated:boolean;
}){
  if(translated||!Object.hasOwn(reviewed,lesson.lesson_key))return null;
  const expected=reviewed[lesson.lesson_key as keyof typeof reviewed];
  const section=lesson.revision.read_sections.find(s=>s.id===expected.first),track=narration?.[expected.first];
  if(lesson.revision.content_hash!==expected.hash||position!==(slides?'slide-':'')+expected.first||!section||!track||!timingsMatchSection(track.timings,{heading:section[en?'heading_en':'heading_fil'],body:section[en?'body_en':'body_fil'],takeaway:section[en?'takeaway_en':'takeaway_fil']??''}))return null;
  return <aside data-narration-access-guide aria-label={en?'Where to find narration':'Saan makikita ang salaysay'} className="my-3 rounded-lg border border-ink/20 bg-canvas p-3 text-sm leading-relaxed text-ink">
    <p>{slides?(en?'For the full recording, open “Full narration and audio” below, then press Listen. Read shows Listen directly.':'Para sa buong recording, buksan ang “Buong salaysay at audio” sa ibaba, saka pindutin ang Pakinggan. Nasa Basahin mismo ang Pakinggan.'):(en?'Press Listen below to hear this section. The final check’s recording becomes available after you choose an answer.':'Pindutin ang Pakinggan sa ibaba para marinig ang bahaging ito. Magiging available ang recording ng huling tanong matapos kang pumili ng sagot.')}</p>
    {illustrated&&<p className="mt-2">{en?'Illustrated narrated lesson has five teaching sections in your selected language. Answer the final self-check separately in Read or Slides.':'May limang bahaging panturo ang Araling may larawan at salaysay sa napili mong wika. Sagutin nang hiwalay ang huling tanong sa Basahin o Slides.'}</p>}
  </aside>;
}

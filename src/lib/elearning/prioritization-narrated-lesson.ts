import data from './prioritization-narrated-lesson.json';
import {timingsMatchSection} from './narration-zones';
import type {LessonNarration} from './reference-narration';
import type {PublishedLesson} from './reference-navigation';
import type {LessonAsset} from './types';

/** A derived presentation of existing approved teaching, not a new revision. */
export function prioritizationNarratedLesson(lesson: PublishedLesson, narration: LessonNarration | undefined, en: boolean) {
  if (lesson.lesson_key !== data.lesson_key || lesson.revision.content_hash !== data.content_hash || lesson.revision.featured_asset_id) return null;
  const language=en?'en':'fil';
  const selected=data.languages[language];
  const sections=data.sections.map(id=>lesson.revision.read_sections.find(s=>s.id===id));
  if (!sections.every((section,i)=>{
    const clip=selected.clips[i], track=narration?.[data.sections[i]];
    return section && !section.check && track?.src===clip.src && timingsMatchSection(track.timings,{
      heading:section[en?'heading_en':'heading_fil'],body:section[en?'body_en':'body_fil'],takeaway:section[en?'takeaway_en':'takeaway_fil']??'',
    });
  })) return null;
  if (!data.assets.every(expected=>lesson.revision.assets.some(a=>a.id===expected.id&&a.path===expected.path&&a.content_hash===expected.content_hash&&a.review_status==='approved'))) return null;
  const scene=lesson.revision.assets.find(a=>a.id===data.assets[0].id)!;
  const asset:LessonAsset={
    id:'problem-prioritize-illustrated-narration',path:data.assets[0].path,content_hash:data.assets[0].content_hash,review_status:'approved',
    provenance:'Assembled from five previously approved Carole AI illustrations and five approved Gemini Kore Read recordings per language. No new teaching words or generated voice. Final check recording excluded.',
    alt_en:'Carole and partners discuss planning criteria, example scores, evidence, a tie and practice.',
    alt_fil:'Tinatalakay ni Carole at mga kasama ang pamantayan, halimbawang marka, ebidensya, tabla at pagsasanay.',
    caption_en:scene.caption_en+' Five teaching sections with the existing approved narration and AI-generated illustrations. The final self-check and its answer audio remain in Read or Slides.',
    caption_fil:scene.caption_fil+' Limang bahaging may dati nang aprubadong salaysay at mga ilustrasyong ginawa gamit ang AI. Nasa Basahin o Slides pa rin ang huling tanong at audio ng sagot nito.',
    videos:{en:data.languages.en.video,fil:data.languages.fil.video},
  };
  return {asset,transcript:{title:en?'Lesson narration as text':'Salaysay ng aralin bilang teksto',paragraphs:sections.flatMap(s=>[
    s![en?'heading_en':'heading_fil'],...s![en?'body_en':'body_fil'].split(/\n\s*\n/),s![en?'takeaway_en':'takeaway_fil']??'',
  ]).filter(Boolean).map(p=>p.replace(/\*\*/g,''))}};
}

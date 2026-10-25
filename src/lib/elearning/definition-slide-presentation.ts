import data from './definition-slide-presentation.json';
import type {PublishedLesson} from './reference-navigation';
import type {LessonAsset} from './types';

/** Bound the six reviewed scene images without altering their source bytes. */
export function isDefinitionScene(asset: LessonAsset) {
  return !asset.video && !asset.videos && asset.review_status==='approved' &&
    data.assets.some(a=>a.id===asset.id&&a.path===asset.path&&a.content_hash===asset.content_hash);
}
export function definitionSlideGuide(lesson: PublishedLesson, position: string, en: boolean) {
  if (lesson.lesson_key!==data.lesson_key || lesson.revision.content_hash!==data.content_hash || !data.slides.includes(position)) return null;
  const index=lesson.revision.slides.findIndex(s=>s.id===position);
  if (index<0 || lesson.revision.slides.length!==data.slides.length) return null;
  return {kind:'definition-slide-guide' as const,index,count:data.slides.length,en};
}

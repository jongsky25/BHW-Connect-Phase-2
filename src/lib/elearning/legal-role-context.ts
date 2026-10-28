import data from './legal-role-context.json';
import type {LessonAsset} from './types';
import type {PublishedLesson} from './reference-navigation';
import {presentationSourceHash} from './feedback-wording-release';

export function legalRoleContext(lesson: PublishedLesson, position: string, en: boolean) {
  if (lesson.lesson_key !== data.lesson_key || presentationSourceHash(lesson.lesson_key,lesson.revision.content_hash) !== data.content_hash) return null;
  const slides = position.startsWith('slide-');
  const section = slides ? position.slice(6) : position;
  if (!Object.hasOwn(data.panels, section)) return null;
  if (!(slides ? lesson.revision.slides : lesson.revision.read_sections).some(s=>s.id===position)) return null;
  const scene=lesson.revision.assets.find(a=>a.id===data.scene.id);
  if (scene?.path!==data.scene.path || scene.content_hash!==data.scene.content_hash || scene.review_status!=='approved') return null;
  if (!lesson.revision.sources.some(s=>s.id===data.source.id&&s.url===data.source.url)) return null;
  const panel=data.panels[section as keyof typeof data.panels][en?'en':'fil'];
  if (!panel.cards.every(card=>lesson.revision.read_sections.find(s=>s.id===card.source_section)?.[en?'body_en':'body_fil'].includes(card.text))) return null;
  return {kind:'legal-role-context' as const,section,en,...panel,sourceUrl:data.source.url};
}
export type LegalRoleContext = NonNullable<ReturnType<typeof legalRoleContext>>;

/** Context for the exact audited recording, independently of its viewing route. */
export function legalStoryContext(asset: LessonAsset, en: boolean) {
  const lang=en?'en':'fil', expected=data.story.videos[lang], video=asset.videos?.[lang];
  if (asset.id!==data.story.id || asset.path!==data.story.path || asset.content_hash!==data.story.content_hash || asset.review_status!=='approved' ||
    video?.path!==expected.path || video.content_hash!==expected.content_hash || video.captions?.path!==expected.captions.path || video.captions.content_hash!==expected.captions.content_hash ||
    video.poster?.path!==expected.poster.path || video.poster.content_hash!==expected.poster.content_hash) return null;
  return {text:data.story[lang],sourceUrl:data.source.url};
}

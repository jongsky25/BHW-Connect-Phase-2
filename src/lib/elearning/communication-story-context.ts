import current from './communication-story-context.json';
import predecessor from './communication-story-context-predecessor.json';
import type {PublishedLesson} from './reference-navigation';
import type {LessonAsset} from './types';

/** Supplement only the two audited lesson/media pairs; later revisions need review. */
export function communicationStorySupplement(lesson: PublishedLesson, asset: LessonAsset, en: boolean) {
  const lang = en ? 'en' : 'fil';
  const data = [current, predecessor].find(candidate =>
    candidate.lesson_key === lesson.lesson_key && candidate.content_hash === lesson.revision.content_hash);
  if (!data) return null;
  const transcript = data.transcript[lang];
  const video = asset.videos?.[lang];
  if (lesson.lesson_key !== data.lesson_key || lesson.revision.content_hash !== data.content_hash ||
    lesson.revision.featured_asset_id !== data.story_asset_id || asset.id !== data.story_asset_id ||
    video?.path !== transcript.video_path || video.content_hash !== transcript.video_hash ||
    video.captions?.path !== transcript.captions_path || video.captions.content_hash !== transcript.captions_hash) return null;
  if (!data.cases.every(person => {
    const section = lesson.revision.read_sections.find(s => s.id === person.section_id);
    return person[lang].split(' … ').every(excerpt => section?.[`body_${lang}`].includes(excerpt));
  })) return null;
  return {
    cases: data.cases.map(person => ({name: person.name, text: person[lang]})),
    transcript: {title: en ? 'Story transcript' : 'Teksto ng pagsasalaysay', paragraphs: transcript.paragraphs},
  };
}

import data from './educator-section-context.json';
import type {PublishedLesson} from './reference-navigation';

export function educatorSectionContext(lesson: PublishedLesson, position: string, en: boolean) {
  if (lesson.lesson_key !== data.lesson_key || lesson.revision.content_hash !== data.content_hash) return null;
  const slides = position.endsWith('-slide');
  const section = slides ? position.slice(0, -6) : position;
  if (!Object.hasOwn(data.sections, section)) return null;
  const positions = slides ? lesson.revision.slides : lesson.revision.read_sections;
  if (!positions.some(p => p.id === position)) return null;
  const entry = data.sections[section as keyof typeof data.sections];
  const read = lesson.revision.read_sections.find(p => p.id === section);
  if (!read || !(en ? read.body_en : read.body_fil).includes(entry[en ? 'en' : 'fil'].excerpt)) return null;
  return {kind: 'educator-context' as const, section, index: entry.index, slides, en, ...entry[en ? 'en' : 'fil']};
}
export type EducatorContext = NonNullable<ReturnType<typeof educatorSectionContext>>;

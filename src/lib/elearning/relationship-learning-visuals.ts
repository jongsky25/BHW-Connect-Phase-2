import {educatorSectionContext} from './educator-section-context';
import {followUpLearningVisual} from './follow-up-learning-visuals';
import data from './relationship-learning-visuals.json';
import type {PublishedLesson} from './reference-navigation';

export function relationshipLearningVisual(lesson: PublishedLesson, position: string, en: boolean) {
  if (lesson.lesson_key === 'bhw-health-educator') return educatorSectionContext(lesson, position, en);
  if (lesson.lesson_key !== data.lesson_key) return followUpLearningVisual(lesson, position, en);
  if (lesson.revision.content_hash !== data.content_hash) return null;
  const section = position.startsWith('slide-') ? position.slice(6) : position;
  if (!Object.hasOwn(data.diagrams, section)) return null;
  const positions = position.startsWith('slide-') ? lesson.revision.slides : lesson.revision.read_sections;
  if (!positions.some(p => p.id === position)) return null;
  const visual = data.diagrams[section as keyof typeof data.diagrams];
  return {kind: visual.kind as 'roles' | 'known' | 'contacts' | 'practice', ...visual[en ? 'en' : 'fil']};
}
export type RelationshipVisual = NonNullable<ReturnType<typeof relationshipLearningVisual>>;

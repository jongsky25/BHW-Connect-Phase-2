import data from './follow-up-learning-visuals.json';
import type {PublishedLesson} from './reference-navigation';

export function followUpLearningVisual(lesson: PublishedLesson, position: string, en: boolean) {
  if (lesson.lesson_key !== data.lesson_key || lesson.revision.content_hash !== data.content_hash) return null;
  const section = position.startsWith('slide-') ? position.slice(6) : position;
  if (!Object.hasOwn(data.diagrams, section)) return null;
  const positions = position.startsWith('slide-') ? lesson.revision.slides : lesson.revision.read_sections;
  if (!positions.some(p => p.id === position)) return null;
  const visual = data.diagrams[section as keyof typeof data.diagrams];
  return {kind: visual.kind as 'questions' | 'response' | 'plan', ...visual[en ? 'en' : 'fil']};
}
export type FollowUpVisual = NonNullable<ReturnType<typeof followUpLearningVisual>>;

import type {
  CourseLesson,
  CourseLessonProgress,
  CourseLessonResume,
  CourseLessonRevision,
  LessonModality,
} from "./types";

export type PublishedLesson = CourseLesson & { revision: CourseLessonRevision };

/** Switching format follows the current authored section, rather than resuming
 * a separately saved page. Both published slide ID conventions are supported;
 * a pair must be unique and share a concept. Unpaired lessons retain resume fallback.
 */
export function switchLessonPosition(
  lesson: PublishedLesson,
  mode: LessonModality,
  current: { id: string; concept_ids: string[] },
  saved?: CourseLessonResume,
) {
  const positions = mode === "read" ? lesson.revision.read_sections : lesson.revision.slides;
  const ids = mode === "slides"
    ? [current.id, `slide-${current.id}`, `${current.id}-slide`]
    : [current.id, current.id.replace(/^slide-/, ""), current.id.replace(/-slide$/, "")];
  const pairs = positions.filter(p => ids.includes(p.id) && p.concept_ids.some(id => current.concept_ids.includes(id)));
  return pairs.length === 1 ? pairs[0] : lessonPosition(lesson, mode, saved, current.concept_ids[0]);
}

export function continueLesson(
  lessons: PublishedLesson[],
  completed: CourseLessonProgress[],
  resumes: CourseLessonResume[],
) {
  const done = new Set(completed.map((p) => p.lesson_id));
  const recent = [...resumes]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .find(
      (r) =>
        !done.has(r.lesson_id) && lessons.some((l) => l.id === r.lesson_id),
    );
  return (
    lessons.find((l) => l.id === recent?.lesson_id) ??
    lessons.find((l) => l.required && !done.has(l.id)) ??
    null
  );
}
export function lessonPosition(
  lesson: PublishedLesson,
  mode: LessonModality,
  saved?: CourseLessonResume,
  concept?: string,
) {
  const positions =
    mode === "read" ? lesson.revision.read_sections : lesson.revision.slides;
  // A stable position may survive a revision change, but only if its concept
  // still agrees. Otherwise use the relevant concept, then the first position.
  const exact =
    saved &&
    positions.find(
      (p) =>
        p.id === saved.position_key && p.concept_ids.includes(saved.concept_id),
    );
  return (
    exact ??
    positions.find((p) =>
      p.concept_ids.includes(concept ?? saved?.concept_id ?? ""),
    ) ??
    positions[0]
  );
}

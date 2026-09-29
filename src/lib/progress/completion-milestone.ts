type Lesson = { id: string; module_id: string; required: boolean };
type Module = { id: string; type: string };

/** Which lesson-count milestone a successful save newly reaches. */
export type CompletionMilestone = "subchapter" | "chapter" | null;

export function completionMilestoneOnSave(
  lesson: Lesson,
  publishedLessons: readonly Lesson[],
  modules: readonly Module[],
  completedLessonIds: ReadonlySet<string>,
): CompletionMilestone {
  const chapterModuleIds = new Set(modules.filter((module) => module.type !== "quiz").map((module) => module.id));
  if (
    !lesson.required ||
    !chapterModuleIds.has(lesson.module_id) ||
    completedLessonIds.has(lesson.id) ||
    !publishedLessons.some((published) => published.id === lesson.id)
  ) return null;

  const remaining = publishedLessons.filter((published) =>
    published.required && chapterModuleIds.has(published.module_id) && !completedLessonIds.has(published.id),
  );
  if (remaining.length === 1 && remaining[0].id === lesson.id) return "chapter";

  const remainingInSubchapter = remaining.filter((published) => published.module_id === lesson.module_id);
  return remainingInSubchapter.length === 1 && remainingInSubchapter[0].id === lesson.id
    ? "subchapter"
    : null;
}

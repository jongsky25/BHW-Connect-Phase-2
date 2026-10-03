import pilot from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-hepo/pilot.ceb.json";
import { translationMatchesLesson, type LessonTranslation } from "./lesson-translation";
import type { PublishedLesson } from "./reference-navigation";

// Only the lesson being opened is serialized to the client. Draft language
// content is available in the existing staff preview, never to learners.
export function translationsForLesson(lesson: PublishedLesson, preview: boolean): LessonTranslation[] {
  const translation = pilot as LessonTranslation;
  return (preview || translation.review_status === "approved") && translationMatchesLesson(lesson, translation)
    ? [translation] : [];
}

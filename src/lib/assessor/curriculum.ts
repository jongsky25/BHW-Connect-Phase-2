import manifest from '../../../content/assessor/bhw-reference-manual.v1.json';
import type { ChapterRequirements } from './readiness';

/** Authored requirements only. Database publication, catchment and evidence
 * must be resolved separately by the server. A draft manifest grants nothing.
 */
export function referenceManualChapter(chapterKey: string): {
  requirements: ChapterRequirements;
  title: string;
  status: string;
  orientationAvailable: false;
} | null {
  const chapter = manifest.chapters.find(c => c.chapter_key === chapterKey);
  if (!chapter) return null;
  return {
    requirements: {
      programKey: manifest.program_key,
      chapterKey: chapter.chapter_key,
      version: manifest.version,
      requiredLessonIds: chapter.modules.flatMap(m => m.required_lesson_keys.map(key => `${m.module_key}:${key}`)),
      exams: chapter.posttest.source ? [{ id: chapter.posttest.id, passingPercent: chapter.posttest.passing_percent }] : [],
    },
    title: chapter.title,
    status: chapter.curriculum_status,
    orientationAvailable: false,
  };
}

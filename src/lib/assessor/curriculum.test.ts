import { expect, test } from 'vitest';
import { referenceManualChapter } from './curriculum';
import { candidateReadiness } from './readiness';

test('app requirements share the actual Reference Manual manifest', () => {
  const chapter = referenceManualChapter('chapter-1')!;
  expect(chapter.requirements.programKey).toBe('bhw-reference-manual');
  expect(chapter.requirements.requiredLessonIds).toHaveLength(42);
  expect(chapter.requirements.exams).toEqual([{ id: 'chapter-1:posttest', passingPercent: 80 }]);
  expect(chapter.status).toBe('draft');
  expect(chapter.orientationAvailable).toBe(true);
});

test('Chapter II requires its own qualifying exam after study', () => {
  const { requirements, orientationAvailable } = referenceManualChapter('chapter-2')!;
  expect(requirements.requiredLessonIds).toHaveLength(55);
  expect(requirements.exams).toEqual([{id:'chapter-2:posttest',passingPercent:80}]);
  expect(orientationAvailable).toBe(true);
  expect(candidateReadiness(requirements, { ...requirements, pretestRecorded: true,
    availableLessonIds: requirements.requiredLessonIds, completedLessonIds: requirements.requiredLessonIds, attempts: [],
  }).state).toBe('exams');
  expect(referenceManualChapter('chapter-3')).toBeNull();
});

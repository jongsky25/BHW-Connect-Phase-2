// @vitest-environment node
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  continueLesson,
  lessonPosition,
  switchLessonPosition,
} from "../../src/lib/elearning/reference-navigation.ts";
const lesson = {
  id: "one",
  required: true,
  revision: {
    id: "r2",
    read_sections: [
      { id: "intro", concept_ids: ["intro"] },
      { id: "role", concept_ids: ["role"] },
    ],
    slides: [
      { id: "role-slide", concept_ids: ["role"] },
      { id: "intro-slide", concept_ids: ["intro"] },
    ],
  },
};
const saved = {
  lesson_id: "one",
  revision_id: "r1",
  modality: "slides",
  position_key: "role-slide",
  concept_id: "role",
  updated_at: "2026-09-24",
};
test("restore stable position across revision and slide reorder", () =>
  assert.equal(lessonPosition(lesson, "slides", saved).id, "role-slide"));
test("map through concept when saved position disappears", () =>
  assert.equal(lessonPosition(lesson, "read", saved).id, "role"));
test("mode-specific saved position wins over switching concept", () =>
  assert.equal(
    lessonPosition(lesson, "slides", saved, "intro").id,
    "role-slide",
  ));
test("removed concept falls back safely", () =>
  assert.equal(
    lessonPosition(lesson, "read", {
      ...saved,
      position_key: "gone",
      concept_id: "gone",
    }).id,
    "intro",
  ));
test("continue most recent incomplete lesson", () =>
  assert.equal(
    continueLesson(
      [lesson, { ...lesson, id: "two" }],
      [],
      [{ ...saved, lesson_id: "two" }],
    )?.id,
    "two",
  ));
test("completed lessons lead to review state", () =>
  assert.equal(
    continueLesson([lesson], [{ lesson_id: "one" }], [saved]),
    null,
  ));

for (const [readId, slideId] of [['body', 'body-slide'], ['section-2', 'slide-section-2'], ['body', 'body']]) {
  test(`mode switching pairs ${readId} with ${slideId} despite shared concepts and an older saved page`, () => {
    const read = {id: readId, concept_ids: ['shared']};
    const slide = {id: slideId, concept_ids: ['shared']};
    const paired = {...lesson, revision: {...lesson.revision,
      read_sections: [{id: 'first', concept_ids: ['shared']}, read],
      slides: [slide, {id: 'first-slide', concept_ids: ['shared']}],
    }};
    assert.equal(switchLessonPosition(paired, 'slides', read, {...saved, position_key: 'first-slide', concept_id: 'shared'}).id, slideId);
    assert.equal(switchLessonPosition(paired, 'read', slide, {...saved, position_key: 'first', concept_id: 'shared'}).id, readId);
  });
}
test('unpaired sections retain the established mode-specific resume fallback', () => {
  assert.equal(switchLessonPosition(lesson, 'slides', {id: 'unpaired', concept_ids: ['intro']}, saved).id, 'role-slide');
});
test('an ID-shaped match with a conflicting concept is not a pair', () => {
  const changed = {...lesson, revision: {...lesson.revision, slides: lesson.revision.slides.map(p => p.id === 'intro-slide' ? {...p, concept_ids: ['wrong']} : p)}};
  assert.equal(switchLessonPosition(changed, 'slides', {id: 'intro', concept_ids: ['intro']}, saved).id, 'role-slide');
});
test('ambiguous ID-shaped matches use the established fallback without guessing an ordinal', () => {
  const ambiguous = {...lesson, revision: {...lesson.revision, slides: [
    ...lesson.revision.slides, {id: 'slide-intro', concept_ids: ['intro']},
  ]}};
  assert.equal(switchLessonPosition(ambiguous, 'slides', {id: 'intro', concept_ids: ['intro']}, saved).id, 'role-slide');
});

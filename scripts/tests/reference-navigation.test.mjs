// @vitest-environment node
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  continueLesson,
  lessonPosition,
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

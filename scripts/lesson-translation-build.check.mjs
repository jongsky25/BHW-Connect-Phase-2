import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { translationLesson } from "./lesson-translation-build.mjs";
import { UHC_COVERAGE_STORY_STYLES, PRIMARY_CARE_STORY_STYLES, LOCAL_SYSTEM_STORY_STYLES, UHC_IMPROVEMENT_STORY_STYLES } from "./lib/tts-providers/gemini.mjs";

test("preserves all module 01 mappings and resolves all four UHC sources explicitly", () => {
  assert.equal(translationLesson([]).key, "bhw-roles-hepo");
  for (let i = 1; i <= 6; i++) {
    const config = translationLesson(["--lesson", `1.1.${i}`]);
    assert.equal(config.module, "01-tungkulin-ng-bhw");
    assert.equal(config.moduleKey, "bhw-1-1");
    assert.equal(config.lessonCount, 6);
  }
  const expected = [
    ["uhc-coverage", ["section-1", "section-2", "included", "benefit", "verify", "check"], 0],
    ["uhc-primary-care", ["bridge", "outpatient", "provider", "referral", "local", "check"], 0],
    ["uhc-local-system", ["section-5", "local-system-board", "local-system-observation", "local-system-promotion", "local-system-feedback", "local-system-check"], 0],
    ["uhc-improvement", ["section-6", "section-7", "improvement-confirm", "improvement-plan", "improvement-feedback", "improvement-check"], 1],
  ];
  expected.forEach(([key, ids, correct], i) => {
    const config = translationLesson(["--lesson", `1.2.${i + 1}`]);
    assert.equal(config.key, key);
    assert.equal(config.module, "02-uhc-act");
    assert.equal(config.moduleKey, "bhw-1-2");
    assert.equal(config.lessonCount, 4);
    const directory = path.resolve(import.meta.dirname, `../content/training/day1-basic-competencies/modules/${config.module}/lessons/${key}`);
    const authored = JSON.parse(readFileSync(path.join(directory, "lesson.json"), "utf8"));
    const slides = JSON.parse(readFileSync(path.join(directory, "slides.json"), "utf8"));
    assert.deepEqual(authored.sections.map(s => s.id), ids);
    assert.deepEqual(slides.map(s => s.id), ids.map(id => `slide-${id}`));
    assert.equal(authored.sections.at(-1).check.correct_option_index, correct);
    assert.equal(slides.at(-1).check.correct_option_index, correct);
    assert.equal(new URL(`http://127.0.0.1:${config.port}`).port, String(4323 + i * 2));
  });
  assert.throws(() => translationLesson(["--lesson", "1.2.5"]));
});

test("every UHC Read/story delivery has independent Cebuano and Hiligaynon directions", () => {
  for (const styles of [UHC_COVERAGE_STORY_STYLES, PRIMARY_CARE_STORY_STYLES, LOCAL_SYSTEM_STORY_STYLES, UHC_IMPROVEMENT_STORY_STYLES]) {
    assert.match(styles.ceb, /Cebuano.*word stress/);
    assert.match(styles.hil, /Hiligaynon.*gently melodic/);
    assert.match(styles.ceb, /exact authored words/);
    assert.match(styles.hil, /switch languages/);
    assert.doesNotMatch(styles.ceb + styles.hil, /Riza/);
  }
  assert.match(PRIMARY_CARE_STORY_STYLES.ceb, /clinician decides.*YAH-kap/);
  assert.match(PRIMARY_CARE_STORY_STYLES.hil, /clinician decides.*YAH-kap/);
});

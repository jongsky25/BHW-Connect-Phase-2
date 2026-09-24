import { describe, expect, it } from "vitest";
import { counts, summariseManualProgress, type ManualProgressInput } from "./manual-progress";

const t = (s: string) => ({ title_fil: `${s} fil`, title_en: `${s} en` });

// Chapter 1 (available): 1.1 with 3 lessons, 1.2 with 2 lessons, 1.3 not yet
// converted, plus a quiz module that is never a subchapter. Chapters 2–3 are
// unavailable, the way program.json ships them.
function input(over: Partial<ManualProgressInput> = {}): ManualProgressInput {
  return {
    program: { id: "p1", content_key: "bhw-reference-manual", ...t("Manual") },
    chapters: [
      { id: "ch2", chapter_key: "chapter-2", position: 1, course_id: null, availability: "unavailable", ...t("Two") },
      { id: "ch1", chapter_key: "chapter-1", position: 0, course_id: "c1", availability: "available", ...t("One") },
      { id: "ch3", chapter_key: "chapter-3", position: 2, course_id: null, availability: "unavailable", ...t("Three") },
    ],
    publishedCourseIds: ["c1"],
    modules: [
      { id: "m2", course_id: "c1", position: 1, type: "lesson", ...t("Sub 2") },
      { id: "m1", course_id: "c1", position: 0, type: "lesson", ...t("Sub 1") },
      { id: "mq", course_id: "c1", position: 3, type: "quiz", ...t("Quiz") },
      { id: "m3", course_id: "c1", position: 2, type: "lesson", ...t("Sub 3") },
    ],
    lessons: [
      { id: "l1", module_id: "m1", position: 0, required: true, ...t("L1") },
      { id: "l2", module_id: "m1", position: 1, required: true, ...t("L2") },
      { id: "l3", module_id: "m1", position: 2, required: true, ...t("L3") },
      { id: "l4", module_id: "m2", position: 0, required: true, ...t("L4") },
      { id: "l5", module_id: "m2", position: 1, required: true, ...t("L5") },
    ],
    courseProgress: [],
    completedLessonIds: [],
    resumes: [],
    attempts: [],
    certificates: [],
    questionBankCourseIds: ["c1"],
    ...over,
  };
}

describe("counts", () => {
  it("never shows 100% before the last lesson is done", () => {
    expect(counts(199, 200)).toEqual({ done: 199, total: 200, percent: 99 });
    expect(counts(2, 2).percent).toBe(100);
    expect(counts(0, 0)).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe("summariseManualProgress", () => {
  it("orders chapters and subchapters, skips quiz modules, and marks unconverted subchapters coming soon", () => {
    const p = summariseManualProgress(input());
    expect(p.chapters.map((c) => c.key)).toEqual(["chapter-1", "chapter-2", "chapter-3"]);
    const [one, two] = p.chapters;
    expect(one.subchapters.map((s) => [s.number, s.state])).toEqual([
      ["1.1", "not_started"],
      ["1.2", "not_started"],
      ["1.3", "coming_soon"],
    ]);
    expect(two).toMatchObject({ state: "unavailable", href: null, steps: [] });
    expect(one.href).toBe("/training/p1/chapter-1");
    expect(one.subchapters[0].lessons[1].href).toBe("/training/p1/chapter-1/m1/l2");
  });

  it("counts only published lessons in available chapters (unconverted content is excluded)", () => {
    const p = summariseManualProgress(input({ completedLessonIds: ["l1", "l2"] }));
    expect(p.counts).toEqual({ done: 2, total: 5, percent: 40 });
    expect(p.chapters[0].counts).toEqual({ done: 2, total: 5, percent: 40 });
    expect(p.chapters[0].subchapters[0].counts).toEqual({ done: 2, total: 3, percent: 67 });
    expect(p.chapters[0].subchapters[2].counts.total).toBe(0);
    expect(p.state).toBe("in_progress");
  });

  it("counts legacy-equivalence completions the same as learner completions", () => {
    // The fetcher passes every course_lesson_progress row regardless of completion_basis.
    const p = summariseManualProgress(input({ completedLessonIds: ["l1", "l2", "l3"] }));
    expect(p.chapters[0].subchapters[0].state).toBe("completed");
  });

  it("marks a started lesson in progress from its resume point", () => {
    const p = summariseManualProgress(input({ resumes: [{ lesson_id: "l4", updated_at: "2026-09-24T01:00:00Z" }] }));
    const sub = p.chapters[0].subchapters[1];
    expect(sub.state).toBe("in_progress");
    expect(sub.lessons.map((l) => l.state)).toEqual(["in_progress", "not_started"]);
    expect(p.chapters[0].state).toBe("in_progress");
  });

  it("ignores optional lessons in the percentage", () => {
    const lessons = [...input().lessons, { id: "opt", module_id: "m2", position: 2, required: false, ...t("Extra") }];
    const p = summariseManualProgress(input({ lessons }));
    expect(p.chapters[0].subchapters[1].counts.total).toBe(2);
    expect(p.chapters[0].subchapters[1].lessons).toHaveLength(3);
  });

  it("keeps completion across lesson revisions because it is keyed on lesson id", () => {
    // Nothing in the input carries a revision; a republished lesson keeps its id.
    const p = summariseManualProgress(input({ completedLessonIds: ["l1"] }));
    expect(p.chapters[0].subchapters[0].lessons[0].state).toBe("completed");
  });

  it("walks the chapter steps: pretest first, then lessons, then post-test, then certificate", () => {
    const steps = (over: Partial<ManualProgressInput>) =>
      summariseManualProgress(input(over)).chapters[0].steps.map((s) => s.state);
    expect(steps({})).toEqual(["current", "todo", "todo", "todo"]);
    expect(steps({ attempts: [{ course_id: "c1", phase: "pretest" }] })).toEqual(["done", "current", "todo", "todo"]);
    expect(
      steps({
        attempts: [{ course_id: "c1", phase: "pretest" }],
        courseProgress: [{ course_id: "c1", status: "content_completed" }],
      }),
    ).toEqual(["done", "done", "current", "todo"]);
    expect(
      steps({
        attempts: [
          { course_id: "c1", phase: "pretest" },
          { course_id: "c1", phase: "posttest" },
        ],
        courseProgress: [{ course_id: "c1", status: "content_completed" }],
      }),
    ).toEqual(["done", "done", "done", "current"]);
  });

  it("skips the test steps when the chapter has no question bank", () => {
    const p = summariseManualProgress(input({ questionBankCourseIds: [] }));
    expect(p.chapters[0].steps.map((s) => s.state)).toEqual(["skipped", "current", "skipped", "todo"]);
  });

  it("shows ready for assessment once the server says content is complete", () => {
    const p = summariseManualProgress(input({ courseProgress: [{ course_id: "c1", status: "content_completed" }] }));
    expect(p.chapters[0].state).toBe("ready_for_assessment");
  });

  it("shows a failed assessment as a retake, never as a danger state", () => {
    const p = summariseManualProgress(
      input({
        courseProgress: [{ course_id: "c1", status: "failed_assessment" }],
        attempts: [
          { course_id: "c1", phase: "pretest" },
          { course_id: "c1", phase: "posttest" },
        ],
      }),
    );
    expect(p.chapters[0].state).toBe("retake_assessment");
    expect(p.chapters[0].steps.find((s) => s.key === "posttest")?.state).toBe("retake");
  });

  it("marks certified chapters and the manual certified when every available chapter is", () => {
    const p = summariseManualProgress(
      input({
        completedLessonIds: ["l1", "l2", "l3", "l4", "l5"],
        courseProgress: [{ course_id: "c1", status: "certified" }],
        certificates: [{ course_id: "c1", verification_code: "ABC123" }],
      }),
    );
    expect(p.chapters[0]).toMatchObject({ state: "certified", certificateCode: "ABC123" });
    expect(p.chapters[0].steps.every((s) => s.state === "done")).toBe(true);
    expect(p.state).toBe("certified");
    expect(p.counts.percent).toBe(100);
    expect(p.continueTo).toBeNull();
  });

  it("treats a chapter whose course is not published as unavailable", () => {
    const p = summariseManualProgress(input({ publishedCourseIds: [] }));
    expect(p.chapters[0].state).toBe("unavailable");
    expect(p.state).toBe("unavailable");
    expect(p.counts.total).toBe(0);
  });

  it("is coming soon when an available chapter has no published lessons yet", () => {
    const p = summariseManualProgress(input({ lessons: [] }));
    expect(p.chapters[0].state).toBe("coming_soon");
    expect(p.state).toBe("coming_soon");
    expect(p.continueTo).toBeNull();
  });

  describe("continue target", () => {
    it("picks the most recently resumed unfinished lesson", () => {
      const p = summariseManualProgress(
        input({
          completedLessonIds: ["l1"],
          resumes: [
            { lesson_id: "l1", updated_at: "2026-09-24T05:00:00Z" },
            { lesson_id: "l2", updated_at: "2026-09-24T01:00:00Z" },
            { lesson_id: "l5", updated_at: "2026-09-24T03:00:00Z" },
          ],
        }),
      );
      expect(p.continueTo).toMatchObject({ href: "/training/p1/chapter-1/m2/l5", subchapterNumber: "1.2" });
    });

    it("falls back to the first unfinished required lesson in reading order", () => {
      const p = summariseManualProgress(input({ completedLessonIds: ["l1", "l2", "l3"] }));
      expect(p.continueTo).toMatchObject({ href: "/training/p1/chapter-1/m2/l4", title_en: "L4 en", chapterNumber: 1 });
    });
  });
});

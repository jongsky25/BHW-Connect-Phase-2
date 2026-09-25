import { describe, expect, it } from "vitest";
import { summariseBhwProgress, type BhwRecords, type SupervisorBhw } from "./load-supervisor-progress";

const t = (s: string) => ({ title_fil: `${s} fil`, title_en: `${s} en` });

const structure = {
  program: { id: "p1", content_key: "bhw-reference-manual", ...t("Manual") },
  chapters: [
    { id: "ch1", chapter_key: "chapter-1", position: 0, course_id: "c1", availability: "available" as const, ...t("One") },
    { id: "ch2", chapter_key: "chapter-2", position: 1, course_id: null, availability: "unavailable" as const, ...t("Two") },
  ],
  publishedCourseIds: ["c1"],
  modules: [
    { id: "m1", course_id: "c1", position: 0, type: "lesson", ...t("Sub 1") },
    { id: "m2", course_id: "c1", position: 1, type: "lesson", ...t("Sub 2") },
  ],
  lessons: [
    { id: "l1", module_id: "m1", position: 0, required: true, ...t("L1") },
    { id: "l2", module_id: "m1", position: 1, required: true, ...t("L2") },
    { id: "l3", module_id: "m2", position: 0, required: true, ...t("L3") },
  ],
  questionBankCourseIds: ["c1"],
};

const bhw = (id: string): SupervisorBhw => ({ id, username: id, full_name: `BHW ${id}`, org_unit_name: "Brgy 1" });

describe("summariseBhwProgress", () => {
  it("keeps each BHW's records to that BHW and preserves the given order", () => {
    const records: BhwRecords = {
      courseProgress: [
        { course_id: "c1", bhw_user_id: "a", status: "in_progress", course_lesson_progress: [{ lesson_id: "l1" }] },
        {
          course_id: "c1",
          bhw_user_id: "b",
          status: "certified",
          course_lesson_progress: [{ lesson_id: "l1" }, { lesson_id: "l2" }, { lesson_id: "l3" }],
        },
      ],
      attempts: [
        { course_id: "c1", bhw_user_id: "b", phase: "pretest" },
        { course_id: "c1", bhw_user_id: "b", phase: "posttest" },
      ],
      certificates: [{ course_id: "c1", bhw_user_id: "b", verification_code: "ABC" }],
    };
    const [c, a, b] = summariseBhwProgress(structure, [bhw("c"), bhw("a"), bhw("b")], records);

    expect(c.bhw.id).toBe("c");
    expect(c.progress.state).toBe("not_started");
    expect(c.progress.counts).toEqual({ done: 0, total: 3, percent: 0 });

    expect(a.progress.counts).toEqual({ done: 1, total: 3, percent: 33 });
    expect(a.progress.chapters[0].state).toBe("in_progress");
    expect(a.progress.chapters[0].steps.find((s) => s.key === "pretest")?.state).toBe("current");

    expect(b.progress.state).toBe("certified");
    expect(b.progress.chapters[0].certificateCode).toBe("ABC");
    expect(b.progress.chapters[1].state).toBe("unavailable");
  });

  it("reads a chapter as started from its course_progress row alone (no resume points here)", () => {
    const [row] = summariseBhwProgress(structure, [bhw("a")], {
      courseProgress: [{ course_id: "c1", bhw_user_id: "a", status: "in_progress", course_lesson_progress: [] }],
      attempts: [],
      certificates: [],
    });
    expect(row.progress.chapters[0].state).toBe("in_progress");
    expect(row.progress.continueTo?.href).toBe("/training/p1/chapter-1/m1/l1");
    expect(row.progress.chapters[0].subchapters.flatMap((s) => s.lessons).every((l) => l.state === "not_started")).toBe(
      true,
    );
  });

  it("shows a failed post-test as a retake", () => {
    const [row] = summariseBhwProgress(structure, [bhw("a")], {
      courseProgress: [
        {
          course_id: "c1",
          bhw_user_id: "a",
          status: "failed_assessment",
          course_lesson_progress: [{ lesson_id: "l1" }, { lesson_id: "l2" }, { lesson_id: "l3" }],
        },
      ],
      attempts: [{ course_id: "c1", bhw_user_id: "a", phase: "posttest" }],
      certificates: [],
    });
    expect(row.progress.chapters[0].state).toBe("retake_assessment");
    // All lessons are done, so the manual shows the retake, not "Completed".
    expect(row.progress.state).toBe("retake_assessment");
    expect(row.progress.chapters[0].steps.find((s) => s.key === "posttest")?.state).toBe("retake");
  });
});

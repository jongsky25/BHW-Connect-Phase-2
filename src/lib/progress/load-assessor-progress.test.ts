import { beforeEach, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import manifest from "../../../content/assessor/bhw-reference-manual.v1.json";
import { loadAssessorProgress } from "./load-assessor-progress";

let tables: Record<string, unknown[]>;
let calls: URL[];
let failure: string | null;
const db = createClient("http://127.0.0.1:54321", "test-key", {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async (input, init) => {
    const url = new URL(String(input)); calls.push(url);
    expect(init?.method ?? "GET").toBe("GET");
    const table = url.pathname.split("/").at(-1)!;
    return new Response(JSON.stringify(table === failure ? { message: "offline" } : tables[table] ?? []), {
      status: table === failure ? 503 : 200, headers: { "Content-Type": "application/json" },
    });
  } },
});
beforeEach(() => {
  calls = []; failure = null;
  const first = manifest.chapters[0].modules[0].required_lesson_keys[0];
  tables = {
    training_programs: [{ id: "manual" }],
    training_program_chapters: [
      { id: "chapter1", program_id: "manual", chapter_key: "chapter-1", course_id: "course", availability: "available", position: 0, title_en: "Basic", title_fil: "Batayan" },
      { id: "chapter2", program_id: "manual", chapter_key: "chapter-2", course_id: null, availability: "unavailable", position: 1, title_en: "Common", title_fil: "Karaniwan" },
    ],
    courses: [{ id: "course" }], course_modules: [{ id: "module", course_id: "course", position: 0 }],
    course_lessons: [{ id: "lesson", module_id: "module", lesson_key: first, published_revision_id: "current" }],
    assessor_lesson_progress: [],
  };
});
it("uses authored totals even when lessons or entire chapters are unpublished", async () => {
  const [p] = await loadAssessorProgress(db, "self");
  const total = manifest.chapters.slice(0, 2).reduce((n, c) => n + c.modules.reduce((s, m) => s + m.required_lesson_keys.length, 0), 0);
  expect(p.counts).toEqual({ done: 0, total, percent: 0 });
  expect(p.chapters[0].href).toBe("/training/manual/assessor/chapter-1");
  expect(p.chapters[1].href).toBeNull();
  expect(p.chapters[0].missing).toBe(p.chapters[0].counts.total - 1);
  expect(calls.find(u => u.pathname.endsWith("assessor_lesson_progress"))?.searchParams.get("assessor_user_id")).toBe("eq.self");
  expect(calls.find(u => u.pathname.endsWith("training_program_chapters"))?.searchParams.get("chapter_key")).toBe('in.(chapter-1,chapter-2)');
  expect(calls.every(u => u.searchParams.has("limit"))).toBe(true);
  expect(calls.some(u => /course_progress|certificates|exam_attempts/.test(u.pathname))).toBe(false);
});
it("counts only current revisions within the matching chapter and ignores duplicate receipts", async () => {
  tables.assessor_lesson_progress = [
    { chapter_id: "chapter1", lesson_id: "lesson", revision_id: "old" },
    { chapter_id: "chapter2", lesson_id: "lesson", revision_id: "current" },
  ];
  expect((await loadAssessorProgress(db, "self"))[0].counts.done).toBe(0);
  tables.assessor_lesson_progress.push(...Array.from({ length: 2 }, () => ({ chapter_id: "chapter1", lesson_id: "lesson", revision_id: "current" })));
  expect((await loadAssessorProgress(db, "self"))[0].counts.done).toBe(1);
});
it("does not offer a study route for a course that is no longer published", async () => {
  tables.courses = [];
  const [p] = await loadAssessorProgress(db, "self");
  expect(p.chapters.every(c => c.href === null)).toBe(true);
  expect(calls.some(u => u.pathname.endsWith("assessor_lesson_progress"))).toBe(false);
});
it.each(["training_programs", "training_program_chapters", "courses", "course_modules", "course_lessons", "assessor_lesson_progress"])("does not manufacture zero progress when %s fails", async table => {
  failure = table;
  await expect(loadAssessorProgress(db, "self")).rejects.toThrow("Unable to load");
});
it("returns no cards when there is no published manual", async () => {
  tables.training_programs = [];
  expect(await loadAssessorProgress(db, "self")).toEqual([]);
  expect(calls).toHaveLength(1);
});

import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSubchapterGuide } from "./load-facilitator-guide";

function fakeDb() {
  const queried: string[] = [];
  const db = {
    from(table: string) {
      queried.push(table);
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        returns: async () => ({ data: [], error: null }),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
  return { db, queried };
}

describe("loadSubchapterGuide", () => {
  const options = {
    courseId: "course-1",
    moduleId: "module-1",
    lessons: [],
    lang: "fil" as const,
    lessonHref: (id: string) => `/lessons/${id}`,
  };

  it("skips all roster reads outside Mga BHW", async () => {
    const { db, queried } = fakeDb();
    const guide = await loadSubchapterGuide(db, { ...options, includeRoster: false });
    expect(queried).not.toContain("users");
    expect(queried).not.toContain("course_progress");
    expect(queried).not.toContain("course_test_attempts");
    expect(queried).not.toContain("competency_observations");
    expect(guide.roster).toEqual([]);
  });

  it("loads the roster data on Mga BHW", async () => {
    const { db, queried } = fakeDb();
    await loadSubchapterGuide(db, { ...options, includeRoster: true });
    expect(queried).toEqual(expect.arrayContaining([
      "users", "course_progress", "course_test_attempts", "competency_observations",
    ]));
  });
});

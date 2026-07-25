import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { getFeatureFlags } from "./get-flags";

function stubClient(rows: { key: string; enabled: boolean }[] | null) {
  return {
    from: () => ({
      select: async () => ({ data: rows }),
    }),
  } as unknown as SupabaseClient;
}

describe("getFeatureFlags", () => {
  it("applies known flag rows over the defaults", async () => {
    const flags = await getFeatureFlags(
      stubClient([
        { key: "kb_articles", enabled: false },
        { key: "reports_export", enabled: true },
        { key: "announcements", enabled: true },
        { key: "surveys", enabled: true },
        { key: "elearning", enabled: true },
        { key: "forum", enabled: true },
      ]),
    );
    expect(flags).toEqual({
      kb_articles: false,
      reports_export: true,
      announcements: true,
      surveys: true,
      elearning: true,
      forum: true,
    });
  });

  it("defaults kb_articles/reports_export to enabled and announcements/surveys/elearning/forum to disabled when the table is empty or unreachable", async () => {
    const expected = {
      kb_articles: true,
      reports_export: true,
      announcements: false,
      surveys: false,
      elearning: false,
      forum: false,
    };
    expect(await getFeatureFlags(stubClient([]))).toEqual(expected);
    expect(await getFeatureFlags(stubClient(null))).toEqual(expected);
  });

  it("ignores unrecognized flag keys", async () => {
    const flags = await getFeatureFlags(stubClient([{ key: "some_future_flag", enabled: false }]));
    expect(flags).toEqual({
      kb_articles: true,
      reports_export: true,
      announcements: false,
      surveys: false,
      elearning: false,
      forum: false,
    });
  });
});

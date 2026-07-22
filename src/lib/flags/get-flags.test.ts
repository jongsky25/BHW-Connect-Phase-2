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
      ]),
    );
    expect(flags).toEqual({ kb_articles: false, reports_export: true });
  });

  it("defaults every known flag to enabled when the table is empty or unreachable", async () => {
    expect(await getFeatureFlags(stubClient([]))).toEqual({ kb_articles: true, reports_export: true });
    expect(await getFeatureFlags(stubClient(null))).toEqual({ kb_articles: true, reports_export: true });
  });

  it("ignores unrecognized flag keys", async () => {
    const flags = await getFeatureFlags(stubClient([{ key: "some_future_flag", enabled: false }]));
    expect(flags).toEqual({ kb_articles: true, reports_export: true });
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { getFeatureFlags } from "./get-flags";

function stubClient(rows: { key: string; enabled: boolean; disabled_roles?: string[] }[] | null) {
  return {
    from: () => ({
      select: async () => ({ data: rows }),
    }),
  } as unknown as SupabaseClient;
}

describe("getFeatureFlags", () => {
  it("applies known flag rows over the defaults (master switches, no role)", async () => {
    const flags = await getFeatureFlags(
      stubClient([
        { key: "kb_articles", enabled: false },
        { key: "reports_export", enabled: true },
        { key: "announcements", enabled: true },
        { key: "surveys", enabled: true },
        { key: "elearning", enabled: true },
        { key: "course_sessions", enabled: true },
        { key: "forum", enabled: true },
        { key: "flipcharts", enabled: true },
        { key: "offline_pwa", enabled: true },
        { key: "notifications", enabled: true },
        { key: "chat_conversation", enabled: true },
        { key: "ai_external", enabled: true },
        { key: "ai_gap_draft", enabled: true },
        { key: "spot_feedback", enabled: true },
      ]),
    );
    expect(flags).toEqual({
      kb_articles: false,
      reports_export: true,
      announcements: true,
      surveys: true,
      elearning: true,
      course_sessions: true,
      forum: true,
      flipcharts: true,
      offline_pwa: true,
      notifications: true,
      chat_conversation: true,
      ai_external: true,
      ai_gap_draft: true,
      spot_feedback: true,
    });
  });

  it("defaults existing features on and new features off when the table is empty or unreachable", async () => {
    const expected = {
      kb_articles: true,
      reports_export: true,
      announcements: false,
      surveys: false,
      elearning: false,
      course_sessions: false,
      forum: false,
      flipcharts: false,
      offline_pwa: false,
      notifications: false,
      chat_conversation: false,
      ai_external: false,
      ai_gap_draft: false,
      spot_feedback: false,
    };
    expect(await getFeatureFlags(stubClient([]))).toEqual(expected);
    expect(await getFeatureFlags(stubClient(null))).toEqual(expected);
    // Same fallback with a role passed — a read failure never exposes an
    // unreviewed feature to any user type either.
    expect(await getFeatureFlags(stubClient([]), "bhw")).toEqual(expected);
  });

  it("ignores unrecognized flag keys", async () => {
    const flags = await getFeatureFlags(stubClient([{ key: "some_future_flag", enabled: false }]));
    expect(flags).toEqual({
      kb_articles: true,
      reports_export: true,
      announcements: false,
      surveys: false,
      elearning: false,
      course_sessions: false,
      forum: false,
      flipcharts: false,
      offline_pwa: false,
      notifications: false,
      chat_conversation: false,
      ai_external: false,
      ai_gap_draft: false,
      spot_feedback: false,
    });
  });

  // RFT A2 (docs/role-feature-toggles-plan.md §4.2): per-type toggles.
  describe("per-type disabled_roles", () => {
    it("turns a flag off for a role listed in disabled_roles, master switch still on", async () => {
      const client = stubClient([{ key: "forum", enabled: true, disabled_roles: ["bhw"] }]);
      expect((await getFeatureFlags(client, "bhw")).forum).toBe(false);
    });

    it("leaves a flag on for a role not listed in disabled_roles", async () => {
      const client = stubClient([{ key: "forum", enabled: true, disabled_roles: ["bhw"] }]);
      expect((await getFeatureFlags(client, "assessor")).forum).toBe(true);
    });

    it("never disables a flag for admin, even when admin is (invalidly) listed", async () => {
      const client = stubClient([{ key: "forum", enabled: true, disabled_roles: ["admin"] }]);
      expect((await getFeatureFlags(client, "admin")).forum).toBe(true);
    });

    it("returns the master switches when no role is passed, ignoring disabled_roles", async () => {
      const client = stubClient([{ key: "forum", enabled: true, disabled_roles: ["bhw", "assessor", "designer"] }]);
      expect((await getFeatureFlags(client)).forum).toBe(true);
    });

    it("the master switch off beats every per-type switch", async () => {
      const client = stubClient([{ key: "forum", enabled: false, disabled_roles: [] }]);
      expect((await getFeatureFlags(client, "assessor")).forum).toBe(false);
      expect((await getFeatureFlags(client)).forum).toBe(false);
    });
  });
});

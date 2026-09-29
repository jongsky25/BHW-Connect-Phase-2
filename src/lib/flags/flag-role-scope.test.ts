import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FLAG_ROLE_SCOPE, type FeatureFlagKey } from "./types";

// RFT A2 (docs/role-feature-toggles-plan.md §5 A2): FLAG_ROLE_SCOPE must
// mirror the latest flag_role_scope() definition exactly — this parses that
// migration's `case` expression out of the SQL text so the two can never
// silently drift apart.
const MIGRATION_PATH = join(
  __dirname,
  "../../../supabase/migrations/20261008000000_spot_feedback.sql",
);

function parseFlagRoleScopeSql(sql: string): Record<string, string[]> {
  const match = sql.match(/select case p_key([\s\S]*?)else '\{\}'::text\[\]\s*\n\s*end;/);
  if (!match) {
    throw new Error("Could not find the flag_role_scope case expression in the migration");
  }
  const body = match[1];
  const scope: Record<string, string[]> = {};
  const lineRe = /when\s+'([a-z_]+)'\s+then\s+array\[([^\]]*)\]/g;
  let lineMatch: RegExpExecArray | null;
  while ((lineMatch = lineRe.exec(body))) {
    const [, key, rolesRaw] = lineMatch;
    const roles = rolesRaw
      .split(",")
      .map((r) => r.trim().replace(/^'|'$/g, ""))
      .filter(Boolean);
    scope[key] = roles;
  }
  return scope;
}

describe("FLAG_ROLE_SCOPE", () => {
  it("matches flag_role_scope() in the latest migration for every key it lists", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8");
    const sqlScope = parseFlagRoleScopeSql(sql);

    expect(Object.keys(sqlScope).sort()).toEqual(
      (Object.keys(FLAG_ROLE_SCOPE) as FeatureFlagKey[])
        .filter((key) => FLAG_ROLE_SCOPE[key].length > 0)
        .sort(),
    );

    for (const [key, roles] of Object.entries(sqlScope)) {
      expect(FLAG_ROLE_SCOPE[key as FeatureFlagKey]).toEqual(roles);
    }
  });

  it("has an entry (possibly empty) for every FeatureFlagKey", () => {
    const keys: FeatureFlagKey[] = [
      "kb_articles",
      "reports_export",
      "announcements",
      "surveys",
      "elearning",
      "course_sessions",
      "forum",
      "flipcharts",
      "offline_pwa",
      "notifications",
      "chat_conversation",
      "ai_external",
      "ai_gap_draft",
      "spot_feedback",
    ];
    for (const key of keys) {
      expect(FLAG_ROLE_SCOPE[key]).toBeDefined();
    }
  });
});

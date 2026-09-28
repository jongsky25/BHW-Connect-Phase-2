import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/auth/roles";
import type { FeatureFlagKey, FeatureFlags } from "./types";

// kb_articles/reports_export default to "on" — the behavior before this
// table existed — so a flags-table read failure never silently hides a
// feature that was already shipping. announcements/surveys/elearning/forum/
// flipcharts/offline_pwa/notifications are brand-new features with no such
// prior behavior to preserve, so they fail closed instead: a flags-read
// failure should never expose an unreviewed feature. chat_conversation is
// the same — falling closed restores the single-turn Chat Guide, which is
// the behaviour the pilot was validated against.
export const DEFAULT_FLAGS: FeatureFlags = {
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
};

type FlagRow = { key: string; enabled: boolean; disabled_roles?: string[] | null };

export async function fetchFlagRows(supabase: SupabaseClient): Promise<FlagRow[]> {
  const { data } = await supabase.from("feature_flags").select("key, enabled, disabled_roles");
  return data ?? [];
}

// Pure so it's easy to unit test against fixture rows and to reuse from
// middleware, which reads the rows itself (docs/role-feature-toggles-plan.md
// §5 A2). With no role, or with "admin", every flag resolves to its master
// switch — nothing is ever hidden from admins (plan §2 D2); use View-as
// (plan §4.4) to see what another user type sees. Otherwise a flag is on
// only when its master switch is on AND the role is not in its
// disabled_roles deny-list (plan §4.2).
export function resolveFlags(rows: FlagRow[], role?: AppRole): FeatureFlags {
  const flags = { ...DEFAULT_FLAGS };
  for (const row of rows) {
    if (!(row.key in flags)) continue;
    const key = row.key as FeatureFlagKey;
    const disabledForRole =
      role !== undefined && role !== "admin" && (row.disabled_roles ?? []).includes(role);
    flags[key] = row.enabled && !disabledForRole;
  }
  return flags;
}

export async function getFeatureFlags(supabase: SupabaseClient, role?: AppRole): Promise<FeatureFlags> {
  const rows = await fetchFlagRows(supabase);
  return resolveFlags(rows, role);
}

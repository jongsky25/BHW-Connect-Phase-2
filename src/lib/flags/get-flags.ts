import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeatureFlagKey, FeatureFlags } from "./types";

// kb_articles/reports_export default to "on" — the behavior before this
// table existed — so a flags-table read failure never silently hides a
// feature that was already shipping. announcements/surveys/elearning are
// brand-new features with no such prior behavior to preserve, so they
// fail closed instead: a flags-read failure should never expose an
// unreviewed feature.
const DEFAULT_FLAGS: FeatureFlags = {
  kb_articles: true,
  reports_export: true,
  announcements: false,
  surveys: false,
  elearning: false,
};

export async function getFeatureFlags(supabase: SupabaseClient): Promise<FeatureFlags> {
  const { data } = await supabase.from("feature_flags").select("key, enabled");

  const flags = { ...DEFAULT_FLAGS };
  for (const row of data ?? []) {
    if (row.key in flags) {
      flags[row.key as FeatureFlagKey] = row.enabled as boolean;
    }
  }
  return flags;
}

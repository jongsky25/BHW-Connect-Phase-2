import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeatureFlagKey, FeatureFlags } from "./types";

// Every flag here defaults to "on" — the behavior before this table existed
// — so a flags-table read failure (or a flag row that hasn't been seeded
// yet) never silently hides a feature that was already shipping.
const DEFAULT_FLAGS: FeatureFlags = {
  kb_articles: true,
  reports_export: true,
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

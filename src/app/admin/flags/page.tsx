import { FlagsConsole } from "@/components/admin/flags-console";
import type { FeatureFlagRow } from "@/lib/flags/types";
import { createClient } from "@/lib/supabase/server";

export default async function AdminFlagsPage() {
  const supabase = await createClient();

  const { data: flags } = await supabase
    .from("feature_flags")
    .select("id, key, enabled, description, updated_at")
    .order("key")
    .returns<FeatureFlagRow[]>();

  return <FlagsConsole initialFlags={flags ?? []} />;
}

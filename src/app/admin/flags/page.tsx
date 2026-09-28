import { FlagsConsole } from "@/components/admin/flags-console";
import type { FeatureFlagRow } from "@/lib/flags/types";
import { createClient } from "@/lib/supabase/server";

export default async function AdminFlagsPage() {
  const supabase = await createClient();

  // Tolerant of the RPC failing (e.g. before the super admin migration is
  // applied): the console just renders read-only rather than erroring.
  const [{ data: flags }, { data: superAdminContext }] = await Promise.all([
    supabase
      .from("feature_flags")
      .select("id, key, enabled, description, disabled_roles, updated_at")
      .order("key")
      .returns<FeatureFlagRow[]>(),
    supabase.rpc("rpc_super_admin_context"),
  ]);
  const canEdit =
    ((superAdminContext as { is_super_admin: boolean }[] | null) ?? [])[0]?.is_super_admin === true;

  return <FlagsConsole initialFlags={flags ?? []} canEdit={canEdit} />;
}

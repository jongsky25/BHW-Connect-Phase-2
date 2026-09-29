import { FlagsConsole } from "@/components/admin/flags-console";
import type { FeatureFlagRow } from "@/lib/flags/types";
import { loadOrgChain, loadOrgUnit } from "@/lib/org-units";
import { getRequestAppUser, getRequestAuthUser } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

export default async function AdminFlagsPage() {
  const supabase = await createClient();
  const { data: { user } } = await getRequestAuthUser();
  const appUser = user ? await getRequestAppUser(user.id) : null;

  // Tolerant of the RPC failing (e.g. before the super admin migration is
  // applied): the console just renders read-only rather than erroring.
  const [{ data: flags }, { data: superAdminContext }] = await Promise.all([
    supabase
      .from("feature_flags")
      .select("id, key, enabled, description, disabled_roles, org_unit_filter, updated_at")
      .order("key")
      .returns<FeatureFlagRow[]>(),
    supabase.rpc("rpc_super_admin_context"),
  ]);
  const canEdit =
    ((superAdminContext as { is_super_admin: boolean }[] | null) ?? [])[0]?.is_super_admin === true;
  const root = appUser ? await loadOrgUnit(supabase, appUser.org_unit_id) : null;
  const pilotId = (flags ?? []).find((flag) => flag.key === "spot_feedback")?.org_unit_filter ?? null;
  const pilotChain = root ? await loadOrgChain(supabase, root.id, pilotId) : [];

  return <FlagsConsole initialFlags={flags ?? []} canEdit={canEdit}
    pilotRoot={root} pilotChain={pilotChain} pilotId={pilotId} />;
}

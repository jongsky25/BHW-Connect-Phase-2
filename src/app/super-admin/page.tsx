import { redirect } from "next/navigation";
import { SuperAdminConsole } from "@/components/super-admin/super-admin-console";
import type { SuperAdminPersona } from "@/lib/super-admin/types";
import { loadOrgUnit } from "@/lib/org-units";
import { getRequestAppUser, getRequestAuthUser } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

// Not under /admin: middleware sends non-admins away from /admin, and while
// signed in as a BHW/assessor/designer persona the super admin still needs
// the way back here (the persona bar returns to this page).
export default async function SuperAdminPage() {
  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: context } = await supabase.rpc("rpc_super_admin_context");
  const row = ((context as { is_super_admin: boolean }[] | null) ?? [])[0];
  if (!row?.is_super_admin) {
    redirect("/home");
  }

  const appUser = await getRequestAppUser(user.id);
  if (!appUser) {
    redirect("/login");
  }

  const [{ data: personas }, rootOrgUnit] = await Promise.all([
    supabase.rpc("rpc_super_admin_personas"),
    loadOrgUnit(supabase, appUser.org_unit_id),
  ]);
  if (!rootOrgUnit) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <SuperAdminConsole
        personas={(personas as SuperAdminPersona[] | null) ?? []}
        rootOrgUnit={rootOrgUnit}
      />
    </div>
  );
}

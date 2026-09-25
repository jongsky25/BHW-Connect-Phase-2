import { redirect } from "next/navigation";
import { SelectBarangayForm } from "@/components/select-barangay-form";
import { loadOrgUnit } from "@/lib/org-units";
import { getRequestAppUser, getRequestAuthUser } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

// Reached only through the middleware gate: a BHW whose account was placed at
// a city/municipality (or wider) picks their PSGC barangay once, here.
export default async function SelectBarangayPage() {
  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) redirect("/login");
  const appUser = await getRequestAppUser(user.id);
  if (!appUser) redirect("/login");
  if (appUser.role !== "bhw" || appUser.org_unit_level === "barangay") redirect("/home");

  const supabase = await createClient();
  const rootOrgUnit = await loadOrgUnit(supabase, appUser.org_unit_id);
  if (!rootOrgUnit) redirect("/login");

  return <SelectBarangayForm rootOrgUnit={rootOrgUnit} />;
}

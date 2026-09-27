import { redirect } from "next/navigation";
import { SelectBarangayForm } from "@/components/select-barangay-form";
import { getViewer } from "@/lib/auth/viewer";
import { loadOrgUnit } from "@/lib/org-units";
import { createClient } from "@/lib/supabase/server";

// Reached through the middleware gate for a real BHW, or directly by an
// admin previewing as BHW (docs/role-feature-toggles-plan.md §4.4).
export default async function SelectBarangayPage() {
  const viewer = await getViewer();
  if (!viewer.appUser) redirect("/login");
  const appUser = viewer.appUser;
  if (viewer.role !== "bhw" || appUser.org_unit_level === "barangay") redirect("/home");

  const supabase = await createClient();
  const rootOrgUnit = await loadOrgUnit(supabase, appUser.org_unit_id);
  if (!rootOrgUnit) redirect("/login");

  return <SelectBarangayForm rootOrgUnit={rootOrgUnit} />;
}

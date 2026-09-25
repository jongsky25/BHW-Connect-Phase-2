import { redirect } from "next/navigation";
import { SurveysConsole } from "@/components/surveys/surveys-console";
import type { Survey } from "@/lib/surveys/types";
import { loadOrgUnit } from "@/lib/org-units";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function AdminSurveysPage() {
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.surveys) {
    redirect("/admin/users");
  }

  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getRequestAppUser(user.id);
  if (!appUser) {
    redirect("/login");
  }

  const [{ data: surveys }, rootOrgUnit] = await Promise.all([
    supabase
      .from("surveys")
      .select(
        "id, org_unit_id, author_user_id, title_fil, title_en, description_fil, description_en, is_anonymous, status, created_at, org_units(name)",
      )
      .order("created_at", { ascending: false })
      .returns<Survey[]>(),
    loadOrgUnit(supabase, appUser.org_unit_id),
  ]);

  if (!rootOrgUnit) redirect("/login");

  return (
    <SurveysConsole
      initialSurveys={surveys ?? []}
      rootOrgUnit={rootOrgUnit}
    />
  );
}

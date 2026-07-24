import { redirect } from "next/navigation";
import { SurveysConsole } from "@/components/surveys/surveys-console";
import type { Survey } from "@/lib/surveys/types";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSurveysPage() {
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.surveys) {
    redirect("/admin/users");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getAppUser(supabase, user.id);
  if (!appUser) {
    redirect("/login");
  }

  const [{ data: surveys }, { data: orgUnits }] = await Promise.all([
    supabase
      .from("surveys")
      .select(
        "id, org_unit_id, author_user_id, title_fil, title_en, description_fil, description_en, is_anonymous, status, created_at, org_units(name)",
      )
      .order("created_at", { ascending: false })
      .returns<Survey[]>(),
    supabase.from("org_units").select("id, name, level").order("name"),
  ]);

  return (
    <SurveysConsole
      initialSurveys={surveys ?? []}
      orgUnits={orgUnits ?? []}
      defaultOrgUnitId={appUser.org_unit_id}
    />
  );
}

import { redirect } from "next/navigation";
import { AssessmentsConsole } from "@/components/elearning/assessments-console";
import type { Assessment } from "@/lib/elearning/types";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

const ASSESSMENT_COLUMNS =
  "id, course_id, bhw_user_id, org_unit_id, status, assessor_user_id, notes, created_at, decided_at, courses(title_fil, title_en), users:bhw_user_id(full_name, username)";

export default async function AssessmentsPage() {
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.elearning) {
    redirect("/home");
  }

  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getRequestAppUser(user.id);
  if (!appUser || appUser.role !== "assessor") {
    redirect("/home");
  }

  const [{ data: queue }, { data: mine }] = await Promise.all([
    supabase
      .from("assessments")
      .select(ASSESSMENT_COLUMNS)
      .eq("status", "pending")
      .order("created_at")
      .returns<Assessment[]>(),
    supabase
      .from("assessments")
      .select(ASSESSMENT_COLUMNS)
      .eq("status", "assigned")
      .eq("assessor_user_id", appUser.id)
      .order("created_at")
      .returns<Assessment[]>(),
  ]);

  return <AssessmentsConsole initialQueue={queue ?? []} initialMine={mine ?? []} />;
}

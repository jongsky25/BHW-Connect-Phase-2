import { redirect } from "next/navigation";
import { CoursesConsole } from "@/components/elearning/courses-console";
import type { Course } from "@/lib/elearning/types";
import { loadOrgUnit } from "@/lib/org-units";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.elearning) {
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

  const [{ data: courses }, rootOrgUnit] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id, org_unit_id, author_user_id, title_fil, title_en, description_fil, description_en, status, quiz_passing_percent, quiz_max_attempts, created_at, org_units(name)",
      )
      .order("created_at", { ascending: false })
      .returns<Course[]>(),
    loadOrgUnit(supabase, appUser.org_unit_id),
  ]);

  if (!rootOrgUnit) redirect("/login");

  return (
    <CoursesConsole
      initialCourses={courses ?? []}
      rootOrgUnit={rootOrgUnit}
    />
  );
}

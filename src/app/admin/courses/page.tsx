import { redirect } from "next/navigation";
import { CoursesConsole } from "@/components/elearning/courses-console";
import type { Course } from "@/lib/elearning/types";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.elearning) {
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

  const [{ data: courses }, { data: orgUnits }] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id, org_unit_id, author_user_id, title_fil, title_en, description_fil, description_en, status, quiz_passing_percent, quiz_max_attempts, created_at, org_units(name)",
      )
      .order("created_at", { ascending: false })
      .returns<Course[]>(),
    supabase.from("org_units").select("id, name, level").order("name"),
  ]);

  return (
    <CoursesConsole
      initialCourses={courses ?? []}
      orgUnits={orgUnits ?? []}
      defaultOrgUnitId={appUser.org_unit_id}
    />
  );
}

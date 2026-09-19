import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { TrainingSessionsConsole } from "@/components/elearning/training-sessions-console";
import type { CourseSession } from "@/lib/elearning/types";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

const SESSION_COLUMNS =
  "id, course_id, org_unit_id, facilitator_user_id, scheduled_at, location_note, lesson_density, status, created_at, courses(title_fil, title_en)";

// INC-23 facilitator UI. A sibling route to /assessments rather than an
// extension of it (docs/training-modules-plan.md leaves the choice to
// implementation time): /assessments today is a single flat pass/fail
// queue with exactly one CTA on /home, not a crowded nav that this needs to
// fold into, and rpc_assessment_decide's console is explicitly not to be
// touched by this increment. Gated on both `elearning` and `course_sessions`
// — the latter is what the INC-19 migration names as the flag that "gates
// the facilitator UI... the same way elearning already gates /courses".
export default async function TrainingSessionsPage() {
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.elearning || !flags.course_sessions) {
    redirect("/home");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getAppUser(supabase, user.id);
  if (!appUser || appUser.role !== "assessor") {
    redirect("/home");
  }

  const locale = await getLocale();

  const [{ data: sessions }, { data: courses }] = await Promise.all([
    supabase
      .from("course_sessions")
      .select(SESSION_COLUMNS)
      .order("scheduled_at", { ascending: false })
      .returns<CourseSession[]>(),
    supabase
      .from("courses")
      .select("id, title_fil, title_en")
      .eq("status", "published")
      .order("title_en"),
  ]);

  return <TrainingSessionsConsole initialSessions={sessions ?? []} courses={courses ?? []} locale={locale} />;
}

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { CourseProgressConsole } from "@/components/admin/course-progress-console";
import type {
  AdminCourseProgressRow,
  AdminModuleProgressCount,
  AdminTestAttemptRow,
} from "@/lib/admin/types";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

// The admin path off the dashboard-SQL runbook step docs/session-handoff.md
// flagged as owed: everything here is readable under the existing
// course_progress_admin_read / course_module_progress_admin_read /
// course_test_attempts_admin_scope RLS policies (INC-12/INC-19), already
// scoped to this admin's org tree, so no new read RPC was needed — only
// the write (rpc_course_progress_reset, INC-29) had nothing to go through.
export default async function AdminCourseProgressPage() {
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
  if (!appUser || appUser.role !== "admin") {
    redirect("/home");
  }

  const { data: progress } = await supabase
    .from("course_progress")
    .select(
      "id, course_id, bhw_user_id, status, started_at, content_completed_at, courses(title_fil, title_en), users(username, full_name, org_units(name))",
    )
    .order("started_at", { ascending: false })
    .returns<AdminCourseProgressRow[]>();

  const progressRows = progress ?? [];
  const progressIds = progressRows.map((row) => row.id);
  const courseIds = [...new Set(progressRows.map((row) => row.course_id))];
  const bhwIds = [...new Set(progressRows.map((row) => row.bhw_user_id))];

  const [{ data: moduleProgress }, { data: testAttempts }] = await Promise.all([
    progressIds.length > 0
      ? supabase
          .from("course_module_progress")
          .select("course_progress_id, completed_at")
          .in("course_progress_id", progressIds)
      : Promise.resolve({ data: [] }),
    courseIds.length > 0 && bhwIds.length > 0
      ? supabase
          .from("course_test_attempts")
          .select("course_id, bhw_user_id, phase, score_percent")
          .in("course_id", courseIds)
          .in("bhw_user_id", bhwIds)
          .returns<AdminTestAttemptRow[]>()
      : Promise.resolve({ data: [] as AdminTestAttemptRow[] }),
  ]);

  // Collapse to a completed-count per course_progress_id — the console
  // only needs "how many modules done", not each row.
  const moduleCounts = new Map<string, number>();
  for (const row of (moduleProgress ?? []) as { course_progress_id: string; completed_at: string | null }[]) {
    if (row.completed_at == null) continue;
    moduleCounts.set(row.course_progress_id, (moduleCounts.get(row.course_progress_id) ?? 0) + 1);
  }
  const moduleCountRows: AdminModuleProgressCount[] = [...moduleCounts.entries()].map(
    ([course_progress_id, completed_count]) => ({ course_progress_id, completed_count }),
  );

  const locale = await getLocale();

  return (
    <CourseProgressConsole
      initialProgress={progressRows}
      moduleCounts={moduleCountRows}
      testAttempts={testAttempts ?? []}
      locale={locale}
    />
  );
}

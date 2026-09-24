import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { TrainingSessionDetail } from "@/components/elearning/training-session-detail";
import type { SessionTestAttempt } from "@/lib/elearning/session-summary";
import type {
  BhwOption,
  CourseModule,
  CourseModuleFacilitatorNotes,
  CourseModuleVisual,
  CourseSession,
  CourseSessionDelivery,
  CourseSessionEnrollment,
} from "@/lib/elearning/types";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

const SESSION_COLUMNS =
  "id, course_id, org_unit_id, facilitator_user_id, scheduled_at, location_note, lesson_density, status, created_at, courses(title_fil, title_en)";

export default async function TrainingSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.elearning || !flags.course_sessions) {
    redirect("/home");
  }

  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getRequestAppUser(user.id);
  // course_sessions_facilitator_own RLS already restricts the row below to
  // sessions this facilitator scheduled — a bhw or an assessor viewing
  // someone else's session gets nothing back here, same refusal shape
  // notFound() already gives a missing id.
  if (!appUser || appUser.role !== "assessor") {
    redirect("/home");
  }

  const locale = await getLocale();

  const { data: session } = await supabase
    .from("course_sessions")
    .select(SESSION_COLUMNS)
    .eq("id", id)
    .maybeSingle<CourseSession>();

  if (!session) {
    notFound();
  }

  const { data: modules } = await supabase
    .from("course_modules")
    .select(
      "id, course_id, position, type, title_fil, title_en, body_fil, body_en, video_url, objectives_fil, objectives_en, summary_fil, summary_en, lesson",
    )
    .eq("course_id", session.course_id)
    .order("position")
    .returns<CourseModule[]>();

  const moduleIds = (modules ?? []).map((m) => m.id);

  const [{ data: visuals }, { data: facilitatorNotes }, { data: enrollments }, { data: deliveries }] = await Promise.all([
    moduleIds.length > 0
      ? supabase
          .from("course_module_visuals")
          .select(
            "id, module_id, position, primitive, svg_markup, image_url, caption_fil, caption_en, alt_text_fil, alt_text_en, tier",
          )
          .in("module_id", moduleIds)
          .order("position")
          .returns<CourseModuleVisual[]>()
      : Promise.resolve({ data: [] as CourseModuleVisual[] }),
    moduleIds.length > 0
      ? supabase
          .from("course_module_facilitator_notes")
          .select(
            "id, module_id, notes_fil, notes_en, competency_statement_fil, competency_statement_en, observation_indicators",
          )
          .in("module_id", moduleIds)
          .returns<CourseModuleFacilitatorNotes[]>()
      : Promise.resolve({ data: [] as CourseModuleFacilitatorNotes[] }),
    supabase
      .from("course_session_enrollments")
      .select("id, session_id, bhw_user_id, status, enrolled_at, users:bhw_user_id(full_name, username)")
      .eq("session_id", id)
      .order("enrolled_at")
      .returns<CourseSessionEnrollment[]>(),
    supabase
      .from("course_session_deliveries")
      .select("id, session_id, module_id, duration_minutes, notes, recorded_at")
      .eq("session_id", id)
      .order("recorded_at")
      .returns<CourseSessionDelivery[]>(),
  ]);

  const enrolledBhwIds = (enrollments ?? []).map((e) => e.bhw_user_id);

  const [{ data: courseProgress }, { data: testAttempts }, { data: bhwCandidates }] = await Promise.all([
    enrolledBhwIds.length > 0
      ? supabase
          .from("course_progress")
          .select("id, bhw_user_id")
          .eq("course_id", session.course_id)
          .in("bhw_user_id", enrolledBhwIds)
      : Promise.resolve({ data: [] as { id: string; bhw_user_id: string }[] }),
    supabase
      .from("course_test_attempts")
      .select("bhw_user_id, phase, score_percent")
      .eq("course_id", session.course_id)
      .eq("session_id", id)
      .returns<SessionTestAttempt[]>(),
    supabase
      .from("users")
      .select("id, username, full_name, org_units(name)")
      .eq("role", "bhw")
      .eq("status", "active")
      .order("full_name")
      .returns<BhwOption[]>(),
  ]);

  const progressIds = (courseProgress ?? []).map((p) => p.id);
  const { data: moduleProgress } =
    progressIds.length > 0
      ? await supabase
          .from("course_module_progress")
          .select("course_progress_id, module_id, completed_at")
          .in("course_progress_id", progressIds)
      : { data: [] as { course_progress_id: string; module_id: string; completed_at: string | null }[] };

  const enrolledIdSet = new Set(enrolledBhwIds);
  const availableCandidates = (bhwCandidates ?? []).filter((c) => !enrolledIdSet.has(c.id));

  return (
    <TrainingSessionDetail
      session={session}
      modules={modules ?? []}
      visuals={visuals ?? []}
      facilitatorNotes={facilitatorNotes ?? []}
      initialEnrollments={enrollments ?? []}
      initialDeliveries={deliveries ?? []}
      courseProgress={courseProgress ?? []}
      moduleProgress={moduleProgress ?? []}
      testAttempts={testAttempts ?? []}
      bhwCandidates={availableCandidates}
      locale={locale}
    />
  );
}

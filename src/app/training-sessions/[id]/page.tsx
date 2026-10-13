import type { ActivityRun } from "@/lib/elearning/activities";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { TrainingSessionDetail } from "@/components/elearning/training-session-detail";
import { Chapter1DraftSession } from "@/components/elearning/chapter1-draft-session";
import {parseSessionReturn} from "@/lib/elearning/session-return";
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
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { getRequestFeatureFlags } from "@/lib/supabase/request";

const SESSION_COLUMNS =
  "id, course_id, org_unit_id, facilitator_user_id, scheduled_at, location_note, lesson_density, status, plan_lesson_id, created_at, courses(title_fil, title_en)";

export default async function TrainingSessionDetailPage({
  params,searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{returnTo?:string}>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.elearning || !flags.course_sessions) {
    redirect("/home");
  }

  const viewer = await getViewer();
  if (!viewer.appUser) {
    redirect("/login");
  }
  // course_sessions_facilitator_own RLS already restricts the row below to
  // sessions this facilitator scheduled — a bhw or an assessor viewing
  // someone else's session gets nothing back here, same refusal shape
  // notFound() already gives a missing id.
  if (viewer.role !== "assessor" || viewer.isPreview || viewer.appUser.status!=="active") {
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

  const rawReturn=(await searchParams).returnTo;
  const requested=parseSessionReturn(rawReturn);
  if(rawReturn&&!requested)notFound();
  let returnHref:string|undefined;
  if(requested){
    const [{data:chapter},{data:lesson}]=await Promise.all([
      supabase.from('training_program_chapters').select('id').eq('program_id',requested.programId)
        .eq('chapter_key','chapter-1').eq('course_id',session.course_id).maybeSingle(),
      supabase.from('course_lessons').select('id,course_modules!inner(course_id)')
        .eq('id',requested.lessonId).eq('module_id',requested.moduleId)
        .eq('course_modules.course_id',session.course_id).maybeSingle(),
    ]);
    if(!chapter||!lesson||(session.status==='draft'&&session.plan_lesson_id!==requested.lessonId))notFound();
    returnHref=requested.href;
  }

  if(session.status==='draft'){
    const {data:runs,error:runError}=await supabase.from('course_session_activities')
      .select('id,session_id,module_id,activity_id,status,duration_minutes,note,activity_snapshot,recorded_at')
      .eq('session_id',id).order('recorded_at').limit(100).returns<ActivityRun[]>();
    if(runError)throw new Error('Unable to load draft activities');
    return <Chapter1DraftSession id={session.id} lang={locale==='en'?'en':'fil'} returnHref={returnHref} runs={runs??[]}/>;
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
            "id, module_id, notes_fil, notes_en, activities, competency_statement_fil, competency_statement_en, observation_indicators",
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

  const { data: activityRuns, error: activityError } = await supabase.from("course_session_activities")
    .select("id,session_id,module_id,activity_id,status,duration_minutes,note,activity_snapshot,recorded_at")
    .eq("session_id",id).order("recorded_at").returns<ActivityRun[]>();
  if(activityError) throw new Error("Unable to load session activities");
  const enrolledBhwIds = (enrollments ?? []).map((e) => e.bhw_user_id);

  const [{ data: courseProgress }, { data: testAttempts }, { data: bhwCandidates }, { data: v2Forms, error: formsError }] = await Promise.all([
    enrolledBhwIds.length > 0
      ? supabase
          .from("course_progress")
          .select("id, bhw_user_id")
          .eq("course_id", session.course_id)
          .in("bhw_user_id", enrolledBhwIds)
      : Promise.resolve({ data: [] as { id: string; bhw_user_id: string }[] }),
    supabase
      .from("course_test_attempts")
      .select("id, bhw_user_id, phase, score_percent")
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
    supabase.rpc("rpc_learner_assessment_session_forms", { p_session_id: id }),
  ]);
  if (formsError) throw new Error("Unable to load assessment form metadata");
  const formByAttempt = new Map(((v2Forms ?? []) as Array<{final_attempt_id:string;form_id:string;release_id:string}>).map(row => [row.final_attempt_id, row]));
  const versionedAttempts = (testAttempts ?? []).map(row => {
    const form = row.id ? formByAttempt.get(row.id) : undefined;
    return form ? {...row, generation: "v2" as const, form_id: form.form_id, release_id: form.release_id} :
      {...row, generation: "legacy" as const};
  });

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
      returnHref={returnHref}
      modules={modules ?? []}
      visuals={visuals ?? []}
      facilitatorNotes={facilitatorNotes ?? []}
      initialEnrollments={enrollments ?? []}
      initialDeliveries={deliveries ?? []}
      initialActivityRuns={activityRuns ?? []}
      courseProgress={courseProgress ?? []}
      moduleProgress={moduleProgress ?? []}
      testAttempts={versionedAttempts}
      bhwCandidates={availableCandidates}
      locale={locale}
    />
  );
}

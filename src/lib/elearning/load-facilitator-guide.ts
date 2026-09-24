import type { SupabaseClient } from "@supabase/supabase-js";
import type { RosterRow } from "@/components/elearning/facilitator-roster";
import type { GuideLesson } from "@/components/elearning/facilitator-guide";
import {
  summariseTestItems,
  type CompetencyObservation,
  type TestItemAttempt,
  type TestItemQuestion,
} from "@/lib/elearning/facilitator-guide";
import type {
  CourseLesson,
  CourseLessonFacilitatorNotes,
  CourseModuleFacilitatorNotes,
  CourseSessionDelivery,
  StableLessonSection,
} from "@/lib/elearning/types";

// Reads for the facilitator guide. Call only for assessor/admin viewers.
// Every read is RLS-scoped: facilitator notes to assessor/admin, BHWs,
// progress, test attempts and observations to the viewer's org subtree
// (20260926000000_facilitator_guide.sql).

export const ROSTER_LIMIT = 500;

type Lang = "fil" | "en";

type UserRow = { id: string; full_name: string; org_units: { name: string } | { name: string }[] | null };
type ProgressRow = { bhw_user_id: string; status: string; course_lesson_progress: Array<{ lesson_id: string }> | null };
type AttemptRow = { bhw_user_id: string; phase: "pretest" | "posttest"; score_percent: number; taken_at: string };

export async function loadSubchapterGuide(
  db: SupabaseClient,
  { courseId, moduleId, lessons, lang, lessonHref }: {
    courseId: string;
    moduleId: string;
    lessons: CourseLesson[];
    lang: Lang;
    lessonHref: (lessonId: string) => string;
  },
) {
  const revisionIds = lessons.map((l) => l.published_revision_id).filter((id): id is string => Boolean(id));
  const [notes, revisions, users, progress, attempts, observations, deliveries] = await Promise.all([
    db.from("course_module_facilitator_notes").select("*").eq("module_id", moduleId).maybeSingle<CourseModuleFacilitatorNotes>(),
    revisionIds.length
      ? db.from("course_lesson_revisions").select("id,read_sections").in("id", revisionIds)
          .returns<Array<{ id: string; read_sections: StableLessonSection[] }>>()
      : Promise.resolve({ data: [], error: null }),
    db.from("users").select("id,full_name,org_units(name)").eq("role", "bhw").eq("status", "active")
      .order("full_name").limit(ROSTER_LIMIT + 1).returns<UserRow[]>(),
    db.from("course_progress").select("bhw_user_id,status,course_lesson_progress(lesson_id)").eq("course_id", courseId)
      .returns<ProgressRow[]>(),
    db.from("course_test_attempts").select("bhw_user_id,phase,score_percent,taken_at").eq("course_id", courseId)
      .returns<AttemptRow[]>(),
    db.from("competency_observations")
      .select("id,bhw_user_id,observer_user_id,module_id,objective_index,level,note,observed_at")
      .eq("module_id", moduleId).order("observed_at", { ascending: false }).returns<CompetencyObservation[]>(),
    // Where this subchapter has been run in the viewer's area (RLS-scoped).
    db.from("course_session_deliveries").select("id,session_id,module_id,duration_minutes,notes,recorded_at")
      .eq("module_id", moduleId).order("recorded_at", { ascending: false }).limit(5).returns<CourseSessionDelivery[]>(),
  ]);
  for (const result of [notes, revisions, users, progress, attempts, observations, deliveries]) {
    if (result.error) throw new Error("Unable to load the facilitator guide");
  }

  const lessonIds = new Set(lessons.map((l) => l.id));
  const guideLessons: GuideLesson[] = lessons.map((l) => {
    const sections = revisions.data?.find((r) => r.id === l.published_revision_id)?.read_sections ?? [];
    return {
      id: l.id,
      href: lessonHref(l.id),
      title: lang === "en" ? l.title_en : l.title_fil,
      objectives: (lang === "en" ? l.objectives_en : l.objectives_fil) ?? [],
      takeaways: sections.map((s) => (lang === "en" ? s.takeaway_en : s.takeaway_fil)).filter(Boolean),
    };
  });

  // Latest attempt per phase; the progress row carries lesson completions.
  const latestScore = (bhw: string, phase: AttemptRow["phase"]) =>
    (attempts.data ?? []).filter((a) => a.bhw_user_id === bhw && a.phase === phase)
      .sort((a, b) => b.taken_at.localeCompare(a.taken_at))[0]?.score_percent ?? null;
  const all = users.data ?? [];
  const roster: RosterRow[] = all.slice(0, ROSTER_LIMIT).map((u) => {
    const own = progress.data?.find((p) => p.bhw_user_id === u.id);
    const unit = Array.isArray(u.org_units) ? u.org_units[0] : u.org_units;
    return {
      id: u.id,
      name: u.full_name,
      unit: unit?.name ?? null,
      lessonsDone: new Set((own?.course_lesson_progress ?? []).map((p) => p.lesson_id).filter((id) => lessonIds.has(id))).size,
      pretest: latestScore(u.id, "pretest"),
      posttest: latestScore(u.id, "posttest"),
      certified: own?.status === "certified",
    };
  });

  return {
    notes: notes.data ?? null,
    lessons: guideLessons,
    roster,
    rosterTruncated: all.length > ROSTER_LIMIT,
    observations: observations.data ?? [],
    deliveries: deliveries.data ?? [],
  };
}

export async function loadLessonGuide(db: SupabaseClient, revisionId: string) {
  const { data, error } = await db.from("course_lesson_facilitator_notes").select("*")
    .eq("revision_id", revisionId).maybeSingle<CourseLessonFacilitatorNotes>();
  if (error) throw new Error("Unable to load the facilitator guide");
  return data;
}

export async function loadChapterTestItems(db: SupabaseClient, courseId: string) {
  const [questions, attempts] = await Promise.all([
    db.from("course_test_questions").select("id,position,prompt_fil,prompt_en,options,correct_option_index")
      .eq("course_id", courseId).order("position").returns<TestItemQuestion[]>(),
    db.from("course_test_attempts").select("bhw_user_id,phase,taken_at,answers").eq("course_id", courseId)
      .returns<TestItemAttempt[]>(),
  ]);
  if (questions.error || attempts.error) throw new Error("Unable to load test results");
  const bhws = new Set((attempts.data ?? []).map((a) => a.bhw_user_id));
  return { items: summariseTestItems(questions.data ?? [], attempts.data ?? []), bhwCount: bhws.size };
}

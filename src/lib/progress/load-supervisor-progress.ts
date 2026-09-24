import type { SupabaseClient } from "@supabase/supabase-js";
import { summariseManualProgress, type ManualProgress, type ManualProgressInput } from "./manual-progress";

// Supervisor (admin) view of many BHWs' progress through one training
// program — docs/bhw-progress-plan.md Phase 3. Same summariser as the
// learner view; only the reads differ. Every read is covered by existing
// admin RLS, already scoped to the admin's org tree: course_progress_admin_read,
// course_test_attempts_admin_scope, certificates_admin_read, and
// training_progress_read (course_lesson_progress, via course_progress). The
// one table admins cannot read is course_lesson_resume, so lesson "started"
// markers and the Continue target are absent here; a chapter still reads as
// started from its course_progress row.

export type SupervisorBhw = { id: string; username: string; full_name: string; org_unit_name: string | null };

export type SupervisorProgram = { id: string; content_key: string; title_fil: string; title_en: string };

type Structure = Pick<
  ManualProgressInput,
  "program" | "chapters" | "publishedCourseIds" | "modules" | "lessons" | "questionBankCourseIds"
>;

export type BhwRecords = {
  courseProgress: Array<{
    course_id: string;
    bhw_user_id: string;
    status: string;
    course_lesson_progress: Array<{ lesson_id: string }> | null;
  }>;
  attempts: Array<{ course_id: string; bhw_user_id: string; phase: "pretest" | "posttest" }>;
  certificates: Array<{ course_id: string; bhw_user_id: string; verification_code: string }>;
};

export type SupervisorRow = { bhw: SupervisorBhw; progress: ManualProgress };

/** Pure: one ManualProgress per BHW, in the order the BHWs were given. */
export function summariseBhwProgress(structure: Structure, bhws: SupervisorBhw[], records: BhwRecords): SupervisorRow[] {
  return bhws.map((bhw) => {
    const own = records.courseProgress.filter((p) => p.bhw_user_id === bhw.id);
    return {
      bhw,
      progress: summariseManualProgress({
        ...structure,
        courseProgress: own.map((p) => ({ course_id: p.course_id, status: p.status })),
        completedLessonIds: own.flatMap((p) => (p.course_lesson_progress ?? []).map((l) => l.lesson_id)),
        resumes: [],
        attempts: records.attempts.filter((a) => a.bhw_user_id === bhw.id),
        certificates: records.certificates.filter((c) => c.bhw_user_id === bhw.id),
      }),
    };
  });
}

// Loads `program`'s structure and the given BHWs' records (one page of
// BHWs, so every `in` list stays short and no read nears the row cap).
export async function loadSupervisorProgress(
  db: SupabaseClient,
  program: SupervisorProgram,
  bhws: SupervisorBhw[],
): Promise<SupervisorRow[]> {
  const fail = (what: string) => {
    throw new Error(`Unable to load ${what}`);
  };

  const { data: chapters, error: chapterError } = await db
    .from("training_program_chapters")
    .select("id,chapter_key,position,title_fil,title_en,course_id,availability")
    .eq("program_id", program.id)
    .order("position");
  if (chapterError) fail("training chapters");

  const courseIds = [...new Set((chapters ?? []).map((c) => c.course_id).filter((id): id is string => !!id))];
  const bhwIds = bhws.map((b) => b.id);
  const none = { data: [], error: null };
  const perBhw = courseIds.length > 0 && bhwIds.length > 0;

  const structureRest = async () => {
    const [courses, modules, banks] = await Promise.all([
      courseIds.length ? db.from("courses").select("id").in("id", courseIds).eq("status", "published") : none,
      courseIds.length
        ? db.from("course_modules").select("id,course_id,position,type,title_fil,title_en").in("course_id", courseIds)
        : none,
      courseIds.length ? db.from("course_test_questions").select("course_id").in("course_id", courseIds) : none,
    ]);
    if (courses.error) fail("chapter courses");
    if (modules.error) fail("subchapters");
    if (banks.error) fail("assessment question banks");
    const moduleIds = (modules.data ?? []).map((m) => m.id);
    const lessons = moduleIds.length
      ? await db
          .from("course_lessons")
          .select("id,module_id,position,title_fil,title_en,required")
          .in("module_id", moduleIds)
          .not("published_revision_id", "is", null)
      : none;
    if (lessons.error) fail("lessons");
    return {
      program,
      chapters: chapters ?? [],
      publishedCourseIds: (courses.data ?? []).map((c) => c.id),
      modules: modules.data ?? [],
      lessons: lessons.data ?? [],
      questionBankCourseIds: [...new Set((banks.data ?? []).map((b) => b.course_id as string))],
    } satisfies Structure;
  };

  const [structure, progress, attempts, certificates] = await Promise.all([
    structureRest(),
    perBhw
      ? db
          .from("course_progress")
          .select("course_id,bhw_user_id,status,course_lesson_progress(lesson_id)")
          .in("course_id", courseIds)
          .in("bhw_user_id", bhwIds)
      : none,
    perBhw
      ? db
          .from("course_test_attempts")
          .select("course_id,bhw_user_id,phase")
          .in("course_id", courseIds)
          .in("bhw_user_id", bhwIds)
      : none,
    perBhw
      ? db
          .from("certificates")
          .select("course_id,bhw_user_id,verification_code")
          .in("course_id", courseIds)
          .in("bhw_user_id", bhwIds)
      : none,
  ]);
  if (progress.error) fail("course progress");
  if (attempts.error) fail("test attempts");
  if (certificates.error) fail("certificates");

  return summariseBhwProgress(structure, bhws, {
    courseProgress: progress.data ?? [],
    attempts: attempts.data ?? [],
    certificates: certificates.data ?? [],
  });
}

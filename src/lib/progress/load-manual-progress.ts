import type { SupabaseClient } from "@supabase/supabase-js";
import { summariseManualProgress, type ManualProgress } from "./manual-progress";

// Loads every published training program's progress for one BHW, or only
// `programId`'s. All reads go through the learner's own RLS (own
// course_progress, own attempts, own certificates), so no new policy or RPC
// is needed.
export async function loadManualProgress(
  db: SupabaseClient,
  bhwUserId: string,
  programId?: string,
): Promise<ManualProgress[]> {
  const fail = (what: string) => {
    throw new Error(`Unable to load ${what}`);
  };

  let programQuery = db
    .from("training_programs")
    .select("id,content_key,title_fil,title_en")
    .eq("status", "published")
    .order("created_at");
  if (programId) programQuery = programQuery.eq("id", programId);
  const chapterQuery = (programIds: string[]) =>
    db
      .from("training_program_chapters")
      .select("id,program_id,chapter_key,position,title_fil,title_en,course_id,availability")
      .in("program_id", programIds)
      .order("position");

  // With a known program the chapters need not wait for the program row.
  const [{ data: programs, error: programError }, scopedChapters] = await Promise.all([
    programQuery,
    programId ? chapterQuery([programId]) : null,
  ]);
  if (programError) fail("training programs");
  if (!programs?.length) return [];

  const { data: chapters, error: chapterError } = scopedChapters ?? (await chapterQuery(programs.map((p) => p.id)));
  if (chapterError) fail("training chapters");

  const courseIds = [...new Set((chapters ?? []).map((c) => c.course_id).filter((id): id is string => !!id))];
  const none = { data: [], error: null };

  const [courses, modules, progress, attempts, certificates, banks] = await Promise.all([
    courseIds.length ? db.from("courses").select("id").in("id", courseIds).eq("status", "published") : none,
    courseIds.length
      ? db.from("course_modules").select("id,course_id,position,type,title_fil,title_en").in("course_id", courseIds)
      : none,
    courseIds.length
      ? db.from("course_progress").select("id,course_id,status").eq("bhw_user_id", bhwUserId).in("course_id", courseIds)
      : none,
    courseIds.length
      ? db.from("course_test_attempts").select("course_id,phase").eq("bhw_user_id", bhwUserId).in("course_id", courseIds)
      : none,
    courseIds.length
      ? db.from("certificates").select("course_id,verification_code").eq("bhw_user_id", bhwUserId).in("course_id", courseIds)
      : none,
    courseIds.length ? db.from("course_test_questions_current").select("course_id").in("course_id", courseIds) : none,
  ]);
  if (courses.error) fail("chapter courses");
  if (modules.error) fail("subchapters");
  if (progress.error) fail("your progress");
  if (attempts.error) fail("your test attempts");
  if (certificates.error) fail("your certificates");
  if (banks.error) fail("assessment question banks");

  const moduleIds = (modules.data ?? []).map((m) => m.id);
  const progressIds = (progress.data ?? []).map((p) => p.id);
  const [lessons, completed, resumes] = await Promise.all([
    moduleIds.length
      ? db
          .from("course_lessons")
          .select("id,module_id,position,title_fil,title_en,required")
          .in("module_id", moduleIds)
          .not("published_revision_id", "is", null)
      : none,
    progressIds.length
      ? db.from("course_lesson_progress").select("lesson_id").in("course_progress_id", progressIds)
      : none,
    progressIds.length
      ? db.from("course_lesson_resume").select("lesson_id,updated_at").in("course_progress_id", progressIds)
      : none,
  ]);
  if (lessons.error) fail("lessons");
  if (completed.error) fail("completed lessons");
  if (resumes.error) fail("lesson resume points");

  return programs.map((program) =>
    summariseManualProgress({
      program,
      chapters: (chapters ?? []).filter((c) => c.program_id === program.id),
      publishedCourseIds: (courses.data ?? []).map((c) => c.id),
      modules: modules.data ?? [],
      lessons: lessons.data ?? [],
      courseProgress: progress.data ?? [],
      completedLessonIds: (completed.data ?? []).map((c) => c.lesson_id),
      resumes: resumes.data ?? [],
      attempts: attempts.data ?? [],
      certificates: certificates.data ?? [],
      questionBankCourseIds: [...new Set((banks.data ?? []).map((b) => b.course_id))],
    }),
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { chapterStudy, type StudyCompletion } from "@/lib/assessor/learning";
import type { CourseLesson } from "@/lib/elearning/types";
import type { Counts } from "./manual-progress";

export type AssessorStudyProgress = {
  programId: string;
  counts: Counts;
  chapters: Array<{
    id: string; number: number; title_fil: string; title_en: string;
    href: string | null; counts: Counts; missing: number;
  }>;
};

function counts(done: number, total: number): Counts {
  return { done, total, percent: total ? Math.round(done / total * 100) : 0 };
}

/** Own study only, through the signed-in client's RLS. No qualification inference.
 * Chapter roots resolve briefing/pretest/next-lesson gates using current state.
 */
export async function loadAssessorProgress(db: SupabaseClient, userId: string): Promise<AssessorStudyProgress[]> {
  const programs = await db.from("training_programs").select("id")
    .eq("content_key", "bhw-reference-manual").eq("status", "published").limit(10);
  if (programs.error) throw new Error("Unable to load assessor programs");
  if (!programs.data?.length) return [];
  const chapters = await db.from("training_program_chapters")
    .select("id,program_id,chapter_key,position,title_fil,title_en,course_id,availability")
    .in("program_id", programs.data.map(p => p.id)).in("chapter_key", ["chapter-1", "chapter-2"])
    .order("position").limit(20);
  if (chapters.error) throw new Error("Unable to load assessor chapters");
  const rows = chapters.data ?? [];
  const courseIds = rows.filter(c => c.availability === "available" && c.course_id).map(c => c.course_id);
  const none = { data: [], error: null };
  const courses = courseIds.length ? await db.from("courses").select("id")
    .in("id", courseIds).eq("status", "published").limit(20) : none;
  if (courses.error) throw new Error("Unable to load assessor courses");
  const publishedIds = (courses.data ?? []).map(c => c.id);
  const available = rows.filter(c => c.availability === "available" && publishedIds.includes(c.course_id));
  const [modules, completed] = await Promise.all([
    publishedIds.length ? db.from("course_modules").select("id,course_id,position")
      .in("course_id", publishedIds).limit(640) : none,
    available.length ? db.from("assessor_lesson_progress").select("chapter_id,lesson_id,revision_id,completed_at")
      .eq("assessor_user_id", userId).in("chapter_id", available.map(c => c.id)).limit(1000)
      .returns<Array<StudyCompletion & { chapter_id: string }>>() : none,
  ]);
  if (modules.error || completed.error) throw new Error("Unable to load assessor study progress");
  // Fail visibly rather than displaying truncated progress as an accurate count.
  if (modules.data?.length === 640 || completed.data?.length === 1000) throw new Error("Assessor progress exceeds read limit");
  const moduleIds = (modules.data ?? []).map(m => m.id);
  const lessons = moduleIds.length ? await db.from("course_lessons")
    .select("id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en,required,published_revision_id,created_at")
    .in("module_id", moduleIds).not("published_revision_id", "is", null).limit(1000).returns<CourseLesson[]>() : none;
  if (lessons.error || lessons.data?.length === 1000) throw new Error("Unable to load assessor lessons");
  return programs.data.map(program => {
    const summaries = rows.filter(c => c.program_id === program.id).map(chapter => {
      const isAvailable = available.some(c => c.id === chapter.id);
      const study = chapterStudy(chapter.chapter_key,
        isAvailable ? (modules.data ?? []).filter(m => m.course_id === chapter.course_id) : [],
        lessons.data ?? [], (completed.data ?? []).filter(c => c.chapter_id === chapter.id), [])!;
      return {
        id: chapter.id, number: chapter.position + 1, title_fil: chapter.title_fil, title_en: chapter.title_en,
        href: isAvailable ? `/training/${program.id}/assessor/${chapter.chapter_key}` : null,
        counts: counts(study.completed, study.total), missing: study.missing,
      };
    });
    return { programId: program.id, chapters: summaries,
      counts: counts(summaries.reduce((n, c) => n + c.counts.done, 0), summaries.reduce((n, c) => n + c.counts.total, 0)) };
  }).filter(p => p.chapters.length > 0);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeatureFlags } from "@/lib/flags/types";
import { withVisible } from "@/lib/content/visibility";

export type SearchResult = {
  id: string;
  kind: "page" | "knowledge" | "training" | "course" | "flipchart" | "survey" | "forum" | "announcement";
  title: string;
  excerpt: string;
  href: string;
};

type Bilingual = { title_fil: string; title_en: string };
type Category = { slug: string } | { slug: string }[] | null;

const label = (row: Bilingual, locale: string) => locale === "en" ? row.title_en : row.title_fil;
const categorySlug = (value: Category) => Array.isArray(value) ? value[0]?.slug : value?.slug;
const clean = (value: string) => value.trim().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").slice(0, 80);
const excerpt = (value: string) => value.length > 140 ? `${value.slice(0, 137)}…` : value;

/** Every call reads current published data under the caller's RLS. No search index to rebuild. */
export async function searchContent(
  db: SupabaseClient,
  flags: FeatureFlags,
  locale: string,
  rawQuery: string,
  perKind = 5,
): Promise<SearchResult[]> {
  const query = clean(rawQuery);
  if (query.length < 2) return [];
  const limit = Math.max(1, Math.min(perKind, 12));
  const pattern = `%${query}%`;
  const matches = (columns: string[]) => columns.map((column) => `${column}.ilike.${pattern}`).join(",");
  const jobs: Array<Promise<SearchResult[]>> = [];

  jobs.push((async () => {
    const [{ data: entries, error: entryError }, articleResponse] = await Promise.all([
      withVisible(db.from("kb_entries")
        .select("id, question_fil, question_en, answer_fil, answer_en, kb_categories(slug)")
        .eq("status", "published"))
        .or(matches(["question_fil", "question_en", "answer_fil", "answer_en"]))
        .limit(limit),
      flags.kb_articles
        ? withVisible(db.from("kb_articles")
          .select("id, title_fil, title_en, kb_categories(slug)")
          .eq("status", "published"))
          .or(matches(["title_fil", "title_en"]))
          .limit(limit)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (entryError || articleResponse.error) throw new Error("Knowledge search failed");
    type Entry = { id: string; question_fil: string; question_en: string; answer_fil: string; answer_en: string; kb_categories: Category };
    type Article = Bilingual & { id: string; kb_categories: Category };
    return [
      ...((entries ?? []) as Entry[]).flatMap((row) => {
        const slug = categorySlug(row.kb_categories);
        return slug ? [{ id: `entry-${row.id}`, kind: "knowledge" as const,
          title: locale === "en" ? row.question_en : row.question_fil,
          excerpt: excerpt(locale === "en" ? row.answer_en : row.answer_fil),
          href: `/kb/${encodeURIComponent(slug)}#entry-${row.id}` }] : [];
      }),
      ...((articleResponse.data ?? []) as Article[]).flatMap((row) => {
        const slug = categorySlug(row.kb_categories);
        return slug ? [{ id: `article-${row.id}`, kind: "knowledge" as const,
          title: label(row, locale), excerpt: "", href: `/kb/${encodeURIComponent(slug)}#article-${row.id}` }] : [];
      }),
    ];
  })());

  if (flags.elearning) jobs.push((async () => {
    const [{ data: programs, error: pError }, { data: courses, error: cError }, { data: chapters, error: chError },
      { data: modules, error: mError }, { data: lessons, error: lError }] = await Promise.all([
      db.from("training_programs").select("id,title_fil,title_en,description_fil,description_en")
        .eq("status", "published").or(matches(["title_fil", "title_en", "description_fil", "description_en"])).limit(limit),
      withVisible(db.from("courses").select("id,title_fil,title_en,description_fil,description_en")
        .eq("status", "published"))
        .or(matches(["title_fil", "title_en", "description_fil", "description_en"])).limit(limit),
      db.from("training_program_chapters").select("id,program_id,chapter_key,course_id,title_fil,title_en")
        .eq("availability", "available").or(matches(["title_fil", "title_en"])).limit(limit),
      db.from("course_modules").select("id,course_id,title_fil,title_en")
        .or(matches(["title_fil", "title_en"])).limit(limit),
      db.from("course_lessons").select("id,module_id,title_fil,title_en")
        .not("published_revision_id", "is", null).or(matches(["title_fil", "title_en"])).limit(limit),
    ]);
    if (pError || cError || chError || mError || lError) throw new Error("Training search failed");
    type Program = Bilingual & { id: string; description_fil: string; description_en: string };
    type Course = Program;
    type Chapter = Bilingual & { id: string; program_id: string; chapter_key: string; course_id: string | null };
    type Module = Bilingual & { id: string; course_id: string };
    type Lesson = Bilingual & { id: string; module_id: string };
    const foundModules = (modules ?? []) as Module[];
    const foundLessons = (lessons ?? []) as Lesson[];
    const missingModuleIds = foundLessons.map((row) => row.module_id).filter((id) => !foundModules.some((m) => m.id === id));
    const { data: parentModules, error: parentError } = missingModuleIds.length
      ? await db.from("course_modules").select("id,course_id,title_fil,title_en").in("id", missingModuleIds).limit(limit)
      : { data: [] as Module[], error: null };
    if (parentError) throw new Error("Training search failed");
    const allModules = [...foundModules, ...((parentModules ?? []) as Module[])];
    const courseIds = [...new Set([...(courses ?? []).map((row) => row.id), ...(chapters ?? []).map((row) => row.course_id).filter(Boolean), ...allModules.map((row) => row.course_id)])] as string[];
    const [{ data: parentChapters, error: parentChapterError }, { data: parentCourses, error: parentCourseError }] = await Promise.all([
      courseIds.length ? db.from("training_program_chapters")
        .select("id,program_id,chapter_key,course_id,title_fil,title_en")
        .eq("availability", "available").in("course_id", courseIds).limit(limit * 3)
        : Promise.resolve({ data: [] as Chapter[], error: null }),
      courseIds.length ? withVisible(db.from("courses").select("id,status").in("id", courseIds)).limit(limit * 3)
        : Promise.resolve({ data: [] as { id: string; status: string }[], error: null }),
    ]);
    if (parentChapterError || parentCourseError) throw new Error("Training search failed");
    const publishedCourses = new Set((parentCourses ?? []).filter((row) => row.status === "published").map((row) => row.id));
    const allChapters = [...((chapters ?? []) as Chapter[]), ...((parentChapters ?? []) as Chapter[])];
    const programIds = [...new Set(allChapters.map((row) => row.program_id))];
    const { data: parentPrograms, error: parentProgramError } = programIds.length
      ? await db.from("training_programs").select("id,status").in("id", programIds).eq("status", "published").limit(limit * 3)
      : { data: [] as { id: string; status: string }[], error: null };
    if (parentProgramError) throw new Error("Training search failed");
    const publishedPrograms = new Set((parentPrograms ?? []).map((row) => row.id));
    const chapterByCourse = new Map<string, Chapter>();
    for (const row of allChapters) {
      if (row.course_id && publishedCourses.has(row.course_id) && publishedPrograms.has(row.program_id)) chapterByCourse.set(row.course_id, row);
    }
    const modulesById = new Map(allModules.map((row) => [row.id, row]));
    return [
      ...((programs ?? []) as Program[]).map((row) => ({ id: `program-${row.id}`, kind: "training" as const,
        title: label(row, locale), excerpt: excerpt(locale === "en" ? row.description_en : row.description_fil), href: `/training/${row.id}` })),
      ...((courses ?? []) as Course[]).map((row) => ({ id: `course-${row.id}`, kind: "course" as const,
        title: label(row, locale), excerpt: excerpt(locale === "en" ? row.description_en : row.description_fil),
        href: chapterByCourse.has(row.id) ? `/training/${chapterByCourse.get(row.id)!.program_id}/${chapterByCourse.get(row.id)!.chapter_key}` : `/courses/${row.id}` })),
      ...((chapters ?? []) as Chapter[]).filter((row) => row.course_id && publishedCourses.has(row.course_id) && publishedPrograms.has(row.program_id)).map((row) => ({
        id: `chapter-${row.id}`, kind: "training" as const, title: label(row, locale), excerpt: "", href: `/training/${row.program_id}/${row.chapter_key}` })),
      ...foundModules.filter((row) => publishedCourses.has(row.course_id)).map((row) => {
        const chapter = chapterByCourse.get(row.course_id);
        return { id: `module-${row.id}`, kind: "training" as const, title: label(row, locale), excerpt: "",
          href: chapter ? `/training/${chapter.program_id}/${chapter.chapter_key}/${row.id}` : `/courses/${row.course_id}` };
      }),
      ...foundLessons.flatMap((row) => {
        const parentModule = modulesById.get(row.module_id);
        if (!parentModule || !publishedCourses.has(parentModule.course_id)) return [];
        const chapter = chapterByCourse.get(parentModule.course_id);
        return [{ id: `lesson-${row.id}`, kind: "training" as const, title: label(row, locale), excerpt: "",
          href: chapter ? `/training/${chapter.program_id}/${chapter.chapter_key}/${parentModule.id}/${row.id}` : `/courses/${parentModule.course_id}` }];
      }),
    ];
  })());

  if (flags.flipcharts) jobs.push((async () => {
    const { data, error } = await withVisible(db.from("flip_charts").select("id,title_fil,title_en")
      .eq("status", "published")).or(matches(["title_fil", "title_en"])).limit(limit);
    if (error) throw new Error("Flipchart search failed");
    return ((data ?? []) as (Bilingual & { id: string })[]).map((row) => ({ id: `flipchart-${row.id}`, kind: "flipchart" as const,
      title: label(row, locale), excerpt: "", href: `/flipcharts/${row.id}` }));
  })());
  if (flags.surveys) jobs.push((async () => {
    const { data, error } = await withVisible(db.from("surveys").select("id,title_fil,title_en,description_fil,description_en")
      .eq("status", "published")).or(matches(["title_fil", "title_en", "description_fil", "description_en"])).limit(limit);
    if (error) throw new Error("Survey search failed");
    return ((data ?? []) as (Bilingual & { id: string; description_fil: string; description_en: string })[]).map((row) => ({
      id: `survey-${row.id}`, kind: "survey" as const, title: label(row, locale),
      excerpt: excerpt(locale === "en" ? row.description_en : row.description_fil), href: `/surveys/${row.id}` }));
  })());
  if (flags.forum) jobs.push((async () => {
    const { data, error } = await db.from("forum_threads").select("id,title,body")
      .eq("status", "visible").is("archived_at", null).or(matches(["title", "body"])).limit(limit);
    if (error) throw new Error("Forum search failed");
    return (data ?? []).map((row) => ({ id: `forum-${row.id}`, kind: "forum" as const,
      title: row.title, excerpt: excerpt(row.body ?? ""), href: `/forum/${row.id}` }));
  })());
  if (flags.announcements) jobs.push((async () => {
    const { data, error } = await withVisible(db.from("announcements").select("id,body_fil,body_en")
      ).or(matches(["body_fil", "body_en"])).limit(limit);
    if (error) throw new Error("Announcement search failed");
    return (data ?? []).map((row) => {
      const body = locale === "en" ? row.body_en : row.body_fil;
      return { id: `announcement-${row.id}`, kind: "announcement" as const,
        title: excerpt(body.split("\n")[0] || body), excerpt: excerpt(body), href: `/announcements#announcement-${row.id}` };
    });
  })());

  const settled = await Promise.allSettled(jobs);
  if (settled.every((job) => job.status === "rejected")) throw new Error("Search sources unavailable");
  return settled.flatMap((job) => job.status === "fulfilled" ? job.value : []);
}

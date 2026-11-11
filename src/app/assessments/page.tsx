import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AssessmentsConsole } from "@/components/elearning/assessments-console";
import { BhwAssessmentHub, type HubChapter, type HubSubchapter } from "@/components/elearning/bhw-assessment-hub";
import type { Assessment } from "@/lib/elearning/types";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { getRequestFeatureFlags } from "@/lib/supabase/request";

const ASSESSMENT_COLUMNS =
  "id, course_id, bhw_user_id, org_unit_id, status, assessor_user_id, attempt_number, notes, created_at, decided_at, courses(title_fil, title_en, assessment_kind), users:bhw_user_id(full_name, username)";

// An assessor's catchment sits at one of these levels (barangay only for rows
// that predate 20261002000100). Anything else is not a usable assignment.
const ASSIGNMENT_LEVELS = ["regional", "provincial", "city_municipal", "barangay"];

type ChapterRow = HubChapter & { course_id: string };

export default async function AssessmentsPage({ searchParams }: { searchParams?: Promise<{ chapter?: string }> }) {
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.elearning) {
    redirect("/home");
  }

  const viewer = await getViewer();
  if (!viewer.appUser) {
    redirect("/login");
  }
  if (viewer.role !== "assessor") {
    redirect("/home");
  }
  const appUser = viewer.appUser;
  const [query, locale] = await Promise.all([searchParams ?? Promise.resolve({ chapter: undefined }), getLocale()]);
  const assignmentValid = Boolean(appUser.org_unit_id) && ASSIGNMENT_LEVELS.includes(appUser.org_unit_level ?? "");

  const [{ data: queue }, { data: mine }, area, program] = await Promise.all([
    supabase
      .from("assessments")
      .select(ASSESSMENT_COLUMNS)
      .eq("status", "pending")
      .order("created_at")
      .returns<Assessment[]>(),
    supabase
      .from("assessments")
      .select(ASSESSMENT_COLUMNS)
      .eq("status", "assigned")
      .eq("assessor_user_id", appUser.id)
      .order("created_at")
      .returns<Assessment[]>(),
    assignmentValid
      ? supabase.from("org_units").select("name").eq("id", appUser.org_unit_id).maybeSingle<{ name: string }>()
      : Promise.resolve({ data: null, error: null }),
    assignmentValid
      ? supabase.from("training_programs").select("id").eq("content_key", "bhw-reference-manual")
        .eq("status", "published").order("created_at").limit(1).maybeSingle<{ id: string }>()
      : Promise.resolve({ data: null, error: null }),
  ]);

  // Chapters come from the content tables, so later chapters appear here as
  // soon as they are marked available and their course is published.
  let chapterError = Boolean(program.error);
  let chapters: ChapterRow[] = [];
  let subchapters: HubSubchapter[] = [];
  let selected: ChapterRow | null = null;
  if (program.data) {
    const { data: rows, error } = await supabase.from("training_program_chapters")
      .select("chapter_key,position,title_fil,title_en,course_id")
      .eq("program_id", program.data.id).eq("availability", "available").not("course_id", "is", null)
      .order("position").limit(20).returns<ChapterRow[]>();
    if (error) chapterError = true;
    const candidates = rows ?? [];
    const published = candidates.length
      ? await supabase.from("courses").select("id").in("id", candidates.map(c => c.course_id)).eq("status", "published").limit(20)
      : { data: [] as Array<{ id: string }>, error: null };
    if (published.error) chapterError = true;
    const publishedIds = new Set((published.data ?? []).map(c => c.id));
    chapters = candidates.filter(c => publishedIds.has(c.course_id));
    selected = chapters.find(c => c.chapter_key === query.chapter) ?? (chapters.length === 1 ? chapters[0] : null);
    const modules = selected
      ? await supabase.from("course_modules").select("id,position,title_fil,title_en").eq("course_id", selected.course_id)
        .order("position").limit(32).returns<HubSubchapter[]>()
      : { data: [] as HubSubchapter[], error: null };
    if (modules.error) chapterError = true;
    subchapters = selected ? modules.data ?? [] : [];
  }

  const hub = <BhwAssessmentHub lang={locale === "en" ? "en" : "fil"} programId={program.data?.id ?? null}
    areaName={area.data?.name ?? null} assignmentValid={assignmentValid} chapterError={chapterError}
    chapters={chapters.map(({ chapter_key, position, title_fil, title_en }) => ({ chapter_key, position, title_fil, title_en }))}
    selected={selected} subchapters={subchapters} />;

  return <AssessmentsConsole initialQueue={queue ?? []} initialMine={mine ?? []} hub={hub} />;
}

import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Chapter1Practice } from "@/components/elearning/chapter1-practice";
import { getViewer } from "@/lib/auth/viewer";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";
import checkpoints from "../../../../../../content/training/day1-basic-competencies/learner-assessment-v2/checkpoints.json";
import orientation from "../../../../../../content/training/day1-basic-competencies/learner-assessment-v2/orientation.json";

export default async function ChapterPracticePage({ params }: { params: Promise<{ id: string; groupKey: string }> }) {
  const { id, groupKey } = await params;
  if (!checkpoints.some(group => group.key === groupKey)) notFound();
  const [viewer, flags, locale] = await Promise.all([getViewer(), getRequestFeatureFlags(), getLocale()]);
  if (!flags.elearning || !flags.chapter1_assessment_v2) redirect("/home");
  if (!viewer.appUser || viewer.appUser.status !== "active") redirect("/login");
  if (viewer.role !== "bhw" || viewer.isPreview) notFound();
  const db = await createClient();
  const { data: mapping } = await db.from("training_program_chapters").select("program_id,chapter_key")
    .eq("course_id", id).eq("chapter_key", "chapter-1").eq("availability", "available").maybeSingle();
  if (!mapping) notFound();
  return <Chapter1Practice courseId={id} groupKey={groupKey} locale={locale}
    chapterHref={`/training/${mapping.program_id}/chapter-1`}
    contentApproved={orientation.editorial_status === "approved"} />;
}

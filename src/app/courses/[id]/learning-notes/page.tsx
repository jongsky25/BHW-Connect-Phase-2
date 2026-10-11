import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Chapter1LearningNotes } from "@/components/elearning/chapter1-learning-notes";
import { getViewer } from "@/lib/auth/viewer";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

type Notes = { drafts: { scope_key: string; insight: string; lesson_feedback: string; language: "en" | "fil"; revision: number }[];
  shared: { id: string; scope_key: string; version: number; insight: string; lesson_feedback: string;
    language: "en" | "fil"; shared_at: string; reviews: { status: string; reply: string; created_at: string }[] }[];
  reviewer: { id: string; name: string } | null };

export default async function LearningNotesPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const { id } = await params;
  const { scope } = await searchParams;
  const [viewer, flags, locale] = await Promise.all([getViewer(), getRequestFeatureFlags(), getLocale()]);
  if (!flags.elearning || !flags.chapter1_assessment_v2) redirect("/home");
  if (!viewer.appUser || viewer.appUser.status !== "active") redirect("/login");
  if (viewer.role !== "bhw") notFound();
  const db = await createClient();
  const [{ data: mapping }, { data, error }] = await Promise.all([
    db.from("training_program_chapters").select("program_id,chapter_key")
      .eq("course_id", id).eq("chapter_key", "chapter-1").eq("availability", "available").maybeSingle(),
    db.rpc("rpc_learning_notes_own", { p_course_id: id }),
  ]);
  if (!mapping || error || !data) notFound();
  const initialScope = scope && /^(entry|chapter|lesson:[a-z0-9-]+|group:G(0[1-9]|1[0-2]))$/.test(scope) ? scope : "chapter";
  return <Chapter1LearningNotes courseId={id} chapterHref={`/training/${mapping.program_id}/chapter-1`}
    locale={locale} initial={data as Notes} initialScope={initialScope} />;
}

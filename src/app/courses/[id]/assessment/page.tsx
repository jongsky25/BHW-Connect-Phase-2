import Link from "next/link";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Chapter1Assessment } from "@/components/elearning/chapter1-assessment";
import { getViewer } from "@/lib/auth/viewer";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";
import orientation from "../../../../../content/training/day1-basic-competencies/learner-assessment-v2/orientation.json";

type AssessmentState = {
  attempts: { attempt_id: string; phase: "pretest" | "posttest"; state: string;
    score_percent: number | null; legacy_attempt_id: string | null }[];
  final_attempts: { id: string; phase: string; score_percent: number }[];
};

export default async function Chapter1AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [viewer, flags, locale] = await Promise.all([getViewer(), getRequestFeatureFlags(), getLocale()]);
  if (!flags.elearning || !flags.course_sessions) redirect("/home");
  if (!viewer.appUser || viewer.appUser.status !== "active") redirect("/login");
  if (viewer.role !== "bhw") notFound();
  const db = await createClient();
  const [{ data: mapping }, { data: progress }, { data: session }, { data: state, error }] = await Promise.all([
    db.from("training_program_chapters").select("program_id,chapter_key,training_programs!inner(content_key,status)")
      .eq("course_id", id).eq("chapter_key", "chapter-1").eq("availability", "available")
      .eq("training_programs.content_key", "bhw-reference-manual").eq("training_programs.status", "published").maybeSingle(),
    db.from("course_progress").select("status").eq("course_id", id)
      .eq("bhw_user_id", viewer.appUser.id).maybeSingle(),
    db.from("course_sessions").select("id").eq("course_id", id).maybeSingle(),
    db.rpc("rpc_learner_assessment_state", { p_course_id: id }),
  ]);
  if (!mapping) notFound();
  if (error) throw new Error("Unable to load Chapter 1 assessment state");
  const current = state as AssessmentState;
  const previousWork = current.attempts.length > 0;
  if (!flags.chapter1_assessment_v2 && !previousWork) redirect(`/training/${mapping.program_id}/chapter-1`);
  return <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6">
    <Chapter1Assessment courseId={id} chapterHref={`/training/${mapping.program_id}/chapter-1`}
      locale={locale} sessionId={session?.id ?? null}
      completed={Boolean(progress && progress.status !== "in_progress")}
      initialState={current} orientation={orientation}
      contentApproved={orientation.editorial_status === "approved" && flags.chapter1_assessment_v2} />
    <Link className="text-sm underline" href={`/training/${mapping.program_id}/chapter-1`}>
      {locale === "en" ? "Chapter outline" : "Balangkas ng kabanata"}
    </Link>
  </main>;
}

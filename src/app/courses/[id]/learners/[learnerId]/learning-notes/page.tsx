import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AdminReviewerAssignment, ReviewerLearningNotes } from "@/components/elearning/chapter1-note-review";
import { getViewer } from "@/lib/auth/viewer";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

export default async function LearnerNotesReviewPage({ params }: {
  params: Promise<{ id: string; learnerId: string }>;
}) {
  const { id, learnerId } = await params;
  const [viewer, flags, locale] = await Promise.all([getViewer(), getRequestFeatureFlags(), getLocale()]);
  if (!flags.elearning || !flags.chapter1_assessment_v2) redirect("/home");
  if (!viewer.appUser || viewer.appUser.status !== "active") redirect("/login");
  if (viewer.role !== "assessor" && viewer.role !== "admin") notFound();
  const db = await createClient();
  const { data: mapping } = await db.from("training_program_chapters").select("program_id,chapter_key")
    .eq("course_id", id).eq("chapter_key", "chapter-1").eq("availability", "available").maybeSingle();
  if (!mapping) notFound();
  const chapterHref = `/training/${mapping.program_id}/chapter-1`;
  if (viewer.role === "assessor") {
    const { data, error } = await db.rpc("rpc_learning_notes_reviewer", {
      p_learner_id: learnerId, p_course_id: id,
    });
    if (error || !data) notFound();
    return <ReviewerLearningNotes courseId={id} learnerId={learnerId}
      chapterHref={chapterHref} locale={locale} initial={data as { shared: [] }} />;
  }
  const [{ data: assignment, error }, { data: reviewers }] = await Promise.all([
    db.rpc("rpc_learning_reviewer_assignment_state", { p_learner_id: learnerId, p_course_id: id }),
    db.from("users").select("id,full_name").eq("role", "assessor").eq("status", "active").order("full_name"),
  ]);
  if (error || !assignment) notFound();
  return <AdminReviewerAssignment courseId={id} learnerId={learnerId}
    chapterHref={chapterHref} locale={locale}
    current={assignment as { reviewer: { reviewer_id: string; reviewer_name: string } | null }}
    reviewers={reviewers ?? []} />;
}

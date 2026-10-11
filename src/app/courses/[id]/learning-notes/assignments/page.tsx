import Link from "next/link";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

export default async function LearningNotesAssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [viewer, flags, locale] = await Promise.all([getViewer(), getRequestFeatureFlags(), getLocale()]);
  if (!flags.elearning || !flags.chapter1_assessment_v2) redirect("/home");
  if (!viewer.appUser || viewer.appUser.status !== "active") redirect("/login");
  if (viewer.role !== "admin") notFound();
  const db = await createClient();
  const [{ data: mapping }, { data: learners }] = await Promise.all([
    db.from("training_program_chapters").select("program_id,chapter_key")
      .eq("course_id", id).eq("chapter_key", "chapter-1").eq("availability", "available").maybeSingle(),
    db.from("users").select("id,full_name").eq("role", "bhw").eq("status", "active").order("full_name").limit(500),
  ]);
  if (!mapping) notFound();
  return <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-10 sm:px-6">
    <h1 className="text-2xl font-semibold">{locale === "en" ? "Assign learning note reviewers" : "Magtalaga ng mga reviewer sa tala"}</h1>
    <p>{locale === "en" ? "Choose a learner to assign an eligible assessor. Note text is not shown to admins." :
      "Pumili ng mag-aaral upang magtalaga ng angkop na assessor. Hindi ipinapakita sa admin ang teksto ng tala."}</p>
    <ul className="space-y-2">{(learners ?? []).map(learner => <li key={learner.id}>
      <Link className="block rounded-md border border-ink/15 p-4 underline"
        href={`/courses/${id}/learners/${learner.id}/learning-notes`}>{learner.full_name}</Link>
    </li>)}</ul>
    <Link className="underline" href={`/training/${mapping.program_id}/chapter-1`}>
      {locale === "en" ? "Back to chapter" : "Bumalik sa kabanata"}</Link>
  </main>;
}

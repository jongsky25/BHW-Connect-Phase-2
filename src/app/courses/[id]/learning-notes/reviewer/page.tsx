import Link from "next/link";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

export default async function LearningNotesQueuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [viewer, flags, locale] = await Promise.all([getViewer(), getRequestFeatureFlags(), getLocale()]);
  if (!flags.elearning || !flags.course_sessions) redirect("/home");
  if (!viewer.appUser || viewer.appUser.status !== "active") redirect("/login");
  if (viewer.role !== "assessor") notFound();
  const db = await createClient();
  const [{ data: mapping }, { data, error }] = await Promise.all([
    db.from("training_program_chapters").select("program_id,chapter_key")
      .eq("course_id", id).eq("chapter_key", "chapter-1").eq("availability", "available").maybeSingle(),
    db.rpc("rpc_learning_notes_queue", { p_course_id: id }),
  ]);
  if (!mapping || error) notFound();
  const entries = (data ?? []) as { learner_id: string; learner_name: string; shared_count: number }[];
  return <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-10 sm:px-6">
    <h1 className="text-2xl font-semibold">{locale === "en" ? "Assigned learning notes" : "Mga nakatalagang tala sa pagkatuto"}</h1>
    <p>{locale === "en" ? "Only learners explicitly assigned to you appear here. Private drafts are never shown." :
      "Tanging mga mag-aaral na hayagang itinalaga sa iyo ang makikita rito. Hindi ipinapakita ang mga pribadong draft."}</p>
    {!entries.length && <p>{locale === "en" ? "No assigned learners yet." : "Wala pang nakatalagang mag-aaral."}</p>}
    <ul className="space-y-2">{entries.map(entry => <li key={entry.learner_id}>
      <Link className="block rounded-md border border-ink/15 p-4 underline"
        href={`/courses/${id}/learners/${entry.learner_id}/learning-notes`}>
        {entry.learner_name} · {entry.shared_count} {locale === "en" ? "shared versions" : "ibinahaging bersyon"}</Link>
    </li>)}</ul>
    <Link className="underline" href={`/training/${mapping.program_id}/chapter-1`}>
      {locale === "en" ? "Back to chapter" : "Bumalik sa kabanata"}</Link>
  </main>;
}

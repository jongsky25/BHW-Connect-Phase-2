"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Draft = { scope_key: string; insight: string; lesson_feedback: string; language: "en" | "fil"; revision: number };
type Shared = { id: string; scope_key: string; version: number; insight: string; lesson_feedback: string;
  language: "en" | "fil"; shared_at: string; reviews: { status: string; reply: string; created_at: string }[] };
type Notes = { drafts: Draft[]; shared: Shared[]; reviewer: { id: string; name: string } | null };

export function Chapter1LearningNotes({ courseId, chapterHref, locale, initial, initialScope }: {
  courseId: string; chapterHref: string; locale: string; initial: Notes; initialScope: string;
}) {
  const lang = locale === "en" ? "en" : "fil";
  const copy = (en: string, fil: string) => lang === "en" ? en : fil;
  const [notes, setNotes] = useState(initial);
  const [scope, setScope] = useState(initialScope);
  const current = notes.drafts.find(d => d.scope_key === scope);
  const [insight, setInsight] = useState(current?.insight ?? "");
  const [lessonFeedback, setLessonFeedback] = useState(current?.lesson_feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const changed = insight !== (current?.insight ?? "") || lessonFeedback !== (current?.lesson_feedback ?? "");
  const button = "rounded-md border border-ink/20 px-4 py-2 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50";

  async function reload() {
    const { data, error: requestError } = await createClient().rpc("rpc_learning_notes_own", { p_course_id: courseId });
    if (requestError) throw requestError;
    setNotes(data as Notes);
  }

  function selectScope(next: string) {
    const draft = notes.drafts.find(row => row.scope_key === next);
    setScope(next); setInsight(draft?.insight ?? ""); setLessonFeedback(draft?.lesson_feedback ?? "");
    setMessage(null); setError(null);
  }

  async function save() {
    setBusy(true); setMessage(null); setError(null);
    try {
      const { error: requestError } = await createClient().rpc("rpc_learning_notes_save", {
        p_course_id: courseId, p_scope_key: scope, p_expected_revision: current?.revision ?? 0,
        p_mutation_id: crypto.randomUUID(), p_insight: insight, p_lesson_feedback: lessonFeedback, p_language: lang,
      });
      if (requestError) throw requestError;
      await reload();
      setMessage(copy("Saved privately. Your reviewer cannot see this draft.",
        "Pribadong na-save. Hindi makikita ng reviewer ang draft na ito."));
    } catch {
      setError(copy("Not saved. Reload to check for a newer draft, then retry.",
        "Hindi na-save. I-reload upang tingnan kung may mas bagong draft, saka subukan muli."));
    } finally { setBusy(false); }
  }

  async function share() {
    if (!current || changed) return;
    setBusy(true); setMessage(null); setError(null);
    try {
      const { data, error: requestError } = await createClient().rpc("rpc_learning_notes_share", {
        p_course_id: courseId, p_scope_key: scope, p_expected_revision: current.revision,
        p_mutation_id: crypto.randomUUID(), p_after_checkpoint_feedback: scope.startsWith("group:"),
      });
      if (requestError) throw requestError;
      await reload();
      setMessage((data as { shared: boolean }).shared ? copy("This saved version is now shared with your assigned reviewer.",
        "Ibinahagi na ang naka-save na bersyong ito sa nakatalagang reviewer.") :
        copy("Add a learning insight or feedback before sharing.", "Magdagdag muna ng natutuhan o puna bago ibahagi."));
    } catch {
      setError(copy("Could not share. Check your saved draft and retry.", "Hindi maibahagi. Suriin ang naka-save na draft at subukan muli."));
    } finally { setBusy(false); }
  }

  return <section className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6">
    <h1 className="text-2xl font-semibold">{copy("My Chapter 1 learning notes", "Aking mga tala sa Kabanata 1")}</h1>
    <p>{copy("These notes are optional and ungraded. Save a private draft first; Share sends only the saved version.",
      "Opsyonal ang mga tala at walang marka. I-save muna bilang pribadong draft; ang Ibahagi ay magpapadala lamang ng naka-save na bersyon.")}</p>
    <p className="rounded-md border border-ink/15 p-3 text-sm">{notes.reviewer ? copy(`Current reviewer: ${notes.reviewer.name}`, `Kasalukuyang reviewer: ${notes.reviewer.name}`) :
      copy("No reviewer assigned yet; a shared note will be available when one is assigned.",
        "Wala pang nakatalagang reviewer; makikita ang ibinahaging tala kapag may naitalaga na.")}</p>
    <label className="block space-y-2"><span className="font-medium">{copy("Note context", "Paksa ng tala")}</span>
      <select className="block w-full rounded-md border border-ink/25 p-2" value={scope}
        onChange={event => selectScope(event.target.value)} disabled={busy || changed}>
        {[...new Set(["entry", "chapter", initialScope, ...notes.drafts.map(d => d.scope_key)])].map(value =>
          <option key={value} value={value}>{value}</option>)}
      </select></label>
    <label className="block space-y-2"><span className="font-medium">{copy("What did you learn or want to understand?", "Ano ang natutuhan o nais mo pang maunawaan?")}</span>
      <textarea className="min-h-28 w-full rounded-md border border-ink/25 p-3" value={insight} maxLength={1000}
        onChange={event => setInsight(event.target.value)} disabled={busy} />
      <span className="block text-xs text-ink/60">{insight.length}/1000</span></label>
    <label className="block space-y-2"><span className="font-medium">{copy("Question or lesson feedback", "Tanong o puna sa aralin")}</span>
      <textarea className="min-h-28 w-full rounded-md border border-ink/25 p-3" value={lessonFeedback} maxLength={1000}
        onChange={event => setLessonFeedback(event.target.value)} disabled={busy} />
      <span className="block text-xs text-ink/60">{lessonFeedback.length}/1000</span></label>
    <div className="flex flex-wrap gap-3"><button className={button} disabled={busy || !changed && Boolean(current)} onClick={() => void save()}>
      {copy("Save private draft", "I-save ang pribadong draft")}</button>
      <button className={button} disabled={busy || changed || !current} onClick={() => void share()}>
        {copy("Share saved version", "Ibahagi ang naka-save na bersyon")}</button></div>
    {changed && <p role="status">{copy("Unsaved changes", "May hindi pa na-save na pagbabago")}</p>}
    {message && <p role="status" className="text-success">{message}</p>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    <section className="space-y-3"><h2 className="text-lg font-semibold">{copy("Shared history and replies", "Kasaysayan ng pagbabahagi at mga sagot")}</h2>
      {!notes.shared.length && <p>{copy("Nothing shared yet.", "Wala pang naibabahagi.")}</p>}
      {notes.shared.map(version => <article key={version.id} className="space-y-2 rounded-md border border-ink/15 p-4">
        <h3 className="font-medium">{version.scope_key} · {copy("Version", "Bersyon")} {version.version}</h3>
        {version.insight && <p lang={version.language === "fil" ? "fil" : "en"}>{version.insight}</p>}
        {version.lesson_feedback && <p lang={version.language === "fil" ? "fil" : "en"}>{version.lesson_feedback}</p>}
        {version.reviews.map((review, i) => <p key={i} className="rounded bg-ink/5 p-2">
          {review.status}{review.reply && `: ${review.reply}`}</p>)}
      </article>)}
    </section>
    <Link className="block underline" href={chapterHref}>{copy("Back to chapter", "Bumalik sa kabanata")}</Link>
  </section>;
}

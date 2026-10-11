"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Shared = { id: string; scope_key: string; version: number; insight: string; lesson_feedback: string;
  language: "en" | "fil"; shared_at: string;
  reviews: { status: string; reply: string; created_at: string }[] };

export function ReviewerLearningNotes({ courseId, learnerId, chapterHref, locale, initial }: {
  courseId: string; learnerId: string; chapterHref: string; locale: string; initial: { shared: Shared[] };
}) {
  const en = locale === "en";
  const pick = (english: string, filipino: string) => en ? english : filipino;
  const [shared, setShared] = useState(initial.shared);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState("Reviewed");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const button = "rounded-md border border-ink/20 px-4 py-2 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50";

  async function record() {
    if (!selected) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const client = createClient();
      const { error: requestError } = await client.rpc("rpc_learning_notes_reply", {
        p_version_id: selected, p_status: status, p_reply: reply,
      });
      if (requestError) throw requestError;
      const { data, error: readError } = await client.rpc("rpc_learning_notes_reviewer", {
        p_learner_id: learnerId, p_course_id: courseId,
      });
      if (readError) throw readError;
      setShared((data as { shared: Shared[] }).shared); setSelected(null); setReply("");
      setMessage(pick("Review recorded for this shared version.", "Naitala ang pagsusuri sa ibinahaging bersyong ito."));
    } catch {
      setError(pick("Could not record your review. Your assignment may have changed.",
        "Hindi naitala ang pagsusuri. Maaaring nagbago ang iyong pagkakatalaga."));
    } finally { setBusy(false); }
  }

  return <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-10 sm:px-6">
    <h1 className="text-2xl font-semibold">{pick("Shared learning notes", "Ibinahaging mga tala sa pagkatuto")}</h1>
    <p>{pick("Only versions the learner explicitly shared appear here. Reflections are not graded practical observations.",
      "Tanging mga bersyong hayagang ibinahagi ng mag-aaral ang makikita rito. Hindi minamarkahan ang mga tala bilang praktikal na obserbasyon.")}</p>
    {!shared.length && <p>{pick("No shared notes yet.", "Wala pang ibinahaging tala.")}</p>}
    {shared.map(version => <article key={version.id} className="space-y-3 rounded-md border border-ink/15 p-4">
      <h2 className="font-medium">{version.scope_key} · {pick("Version", "Bersyon")} {version.version}</h2>
      {version.insight && <p lang={version.language}>{version.insight}</p>}
      {version.lesson_feedback && <p lang={version.language}>{version.lesson_feedback}</p>}
      {version.reviews.map((review, i) => <p key={i} className="rounded-md bg-ink/5 p-2">
        {review.status}{review.reply && `: ${review.reply}`}</p>)}
      <button className={button} onClick={() => { setSelected(version.id); setStatus("Reviewed"); setReply(""); }}>
        {pick("Review this version", "Suriin ang bersyong ito")}</button>
      {selected === version.id && <div className="space-y-3 rounded-md border border-ink/15 p-3">
        <label className="block">{pick("Status", "Katayuan")}
          <select className="mt-1 block w-full rounded-md border border-ink/20 p-2" value={status}
            onChange={event => setStatus(event.target.value)}>
            {["Reviewed", "Follow-up needed", "Responded"].map(value => <option key={value}>{value}</option>)}
          </select></label>
        <label className="block">{pick("Reply to learner (optional unless Responded)", "Sagot sa mag-aaral (opsyonal maliban kung Tumugon)")}
          <textarea className="mt-1 block min-h-24 w-full rounded-md border border-ink/20 p-2" value={reply}
            maxLength={1000} onChange={event => setReply(event.target.value)} /></label>
        <button className={button} disabled={busy || status === "Responded" && !reply.trim()} onClick={() => void record()}>
          {pick("Record review", "Itala ang pagsusuri")}</button>
      </div>}
    </article>)}
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="text-danger">{error}</p>}
    <Link className="block underline" href={chapterHref}>{pick("Back to chapter", "Bumalik sa kabanata")}</Link>
  </main>;
}

export function AdminReviewerAssignment({ courseId, learnerId, chapterHref, locale, current,
  reviewers }: { courseId: string; learnerId: string; chapterHref: string; locale: string;
  current: { reviewer: { reviewer_id: string; reviewer_name: string } | null };
  reviewers: { id: string; full_name: string }[] }) {
  const en = locale === "en";
  const pick = (english: string, filipino: string) => en ? english : filipino;
  const [selected, setSelected] = useState(current.reviewer?.reviewer_id ?? "");
  const [assigned, setAssigned] = useState(current.reviewer?.reviewer_name ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function assign() {
    setBusy(true); setError(null); setMessage(null);
    try {
      const { error: requestError } = await createClient().rpc("rpc_learning_reviewer_assign", {
        p_learner_id: learnerId, p_course_id: courseId, p_reviewer_id: selected || null,
      });
      if (requestError) throw requestError;
      setAssigned(reviewers.find(reviewer => reviewer.id === selected)?.full_name ?? null);
      setMessage(pick("Assignment updated.", "Nabago ang nakatalagang reviewer."));
    } catch {
      setError(pick("Could not update the assignment. Check reviewer eligibility and scope.",
        "Hindi mabago ang nakatalagang reviewer. Suriin ang pagiging angkop at saklaw niya."));
    } finally { setBusy(false); }
  }

  return <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-10 sm:px-6">
    <h1 className="text-2xl font-semibold">{pick("Learning note reviewer assignment", "Pagtatalaga ng reviewer sa tala sa pagkatuto")}</h1>
    <p>{pick("Admins manage the assignment only; private drafts and shared note text are not shown here.",
      "Pagtatalaga lamang ang pinamamahalaan ng admin; hindi ipinapakita rito ang pribadong draft o ibinahaging teksto.")}</p>
    <p>{pick("Current reviewer", "Kasalukuyang reviewer")}: {assigned ?? pick("None", "Wala")}</p>
    <label className="block">{pick("Assign an assessor", "Magtalaga ng assessor")}
      <select className="mt-1 block w-full rounded-md border border-ink/20 p-2" value={selected}
        onChange={event => setSelected(event.target.value)}>
        <option value="">{pick("No reviewer", "Walang reviewer")}</option>
        {reviewers.map(reviewer => <option key={reviewer.id} value={reviewer.id}>{reviewer.full_name}</option>)}
      </select></label>
    <button className="rounded-md border border-ink/20 px-4 py-2 disabled:opacity-50" disabled={busy} onClick={() => void assign()}>
      {pick("Save assignment", "I-save ang pagtatalaga")}</button>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="text-danger">{error}</p>}
    <Link className="block underline" href={chapterHref}>{pick("Back to chapter", "Bumalik sa kabanata")}</Link>
  </main>;
}

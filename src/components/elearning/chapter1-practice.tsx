"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Text = { en: string; fil: string };
type Item = { item_id: string; stem: Text; options: { id: string; label: Text }[] };
type Event = { item_id: string; kind: string; option_id: string | null; first_for_item: boolean;
  correct: boolean; feedback: { correct_option_id: string; rationale: Text; distractor_rationale: Text | null } };
type Practice = { attempt_id: string; group_key: string; state: string; first_items: Item[];
  alternate_items: Item[]; events: Event[] };

export function Chapter1Practice({ courseId, groupKey, chapterHref, locale, contentApproved }: {
  courseId: string; groupKey: string; chapterHref: string; locale: string; contentApproved: boolean;
}) {
  const lang = locale === "en" ? "en" : "fil";
  const copy = (en: string, fil: string) => lang === "en" ? en : fil;
  const [practice, setPractice] = useState<Practice | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [kind, setKind] = useState<"choice" | "unknown" | null>(null);
  const [optionId, setOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Event | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = practice ? [...practice.first_items, ...practice.alternate_items] : [];
  const item = items.find(row => row.item_id === itemId);
  const eventFor = (id: string) => practice?.events.find(event => event.item_id === id);
  const button = "rounded-md border border-ink/20 px-4 py-2 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50";

  async function open() {
    setBusy(true); setError(null);
    try {
      const { data, error: requestError } = await createClient().rpc("rpc_chapter_practice_start", {
        p_course_id: courseId, p_group_key: groupKey,
      });
      if (requestError) throw requestError;
      const next = data as Practice;
      setPractice(next); setItemId(next.first_items[0].item_id);
    } catch {
      setError(copy("Checkpoint is unavailable. It does not block your chapter progress.",
        "Hindi magamit ang maikling pagsasanay. Hindi nito hinahadlangan ang iyong progreso sa kabanata."));
    } finally { setBusy(false); }
  }

  async function commit() {
    if (!practice || !item || !kind || (kind === "choice" && !optionId)) return;
    setBusy(true); setError(null);
    try {
      const client = createClient();
      const { data, error: requestError } = await client.rpc("rpc_chapter_practice_commit", {
        p_attempt_id: practice.attempt_id, p_item_id: item.item_id, p_kind: kind,
        p_option_id: kind === "choice" ? optionId : null, p_mutation_id: crypto.randomUUID(),
      });
      if (requestError) throw requestError;
      const { data: current, error: getError } = await client.rpc("rpc_chapter_practice_get", { p_attempt_id: practice.attempt_id });
      if (getError) throw getError;
      setPractice(current as Practice); setFeedback({ ...data as Event, item_id: item.item_id });
    } catch {
      setError(copy("Your practice answer was not confirmed. Reload this checkpoint before retrying.",
        "Hindi nakumpirma ang sagot sa pagsasanay. I-reload ang pagsasanay bago subukan muli."));
    } finally { setBusy(false); }
  }

  return <section className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-10 sm:px-6">
    <h1 className="text-2xl font-semibold">{copy("Chapter 1 practice", "Pagsasanay sa Kabanata 1")} · {groupKey}</h1>
    <p>{copy("This checkpoint is optional. Feedback appears after you commit each answer and does not change your test score.",
      "Opsyonal ang maikling pagsasanay na ito. Lalabas ang paliwanag pagkatapos isumite ang bawat sagot at hindi nito binabago ang iskor sa pagsusulit.")}</p>
    {!practice && <button className={button} disabled={busy || !contentApproved} onClick={() => void open()}>
      {copy("Start or resume practice", "Simulan o ipagpatuloy ang pagsasanay")}</button>}
    {!contentApproved && !practice && <p>{copy("Practice items are awaiting content review.", "Hinihintay pa ang pagsusuri ng mga tanong sa pagsasanay.")}</p>}
    {practice && <>
      <nav className="flex flex-wrap gap-2" aria-label={copy("Practice questions", "Mga tanong sa pagsasanay")}>
        {practice.first_items.map((row, i) => <button key={row.item_id} className={button} onClick={() => { setItemId(row.item_id); setKind(null); setOptionId(null); setFeedback(eventFor(row.item_id) ?? null); }}>
          {copy(`Question ${i + 1}`, `Tanong ${i + 1}`)} {eventFor(row.item_id) ? "✓" : ""}</button>)}
        {practice.alternate_items.map((row, i) => <button key={row.item_id} className={button}
          disabled={!eventFor(practice.first_items[i].item_id)} onClick={() => { setItemId(row.item_id); setKind(null); setOptionId(null); setFeedback(eventFor(row.item_id) ?? null); }}>
          {copy(`Fresh alternate ${i + 1}`, `Bagong alternatibo ${i + 1}`)} {eventFor(row.item_id) ? "✓" : ""}</button>)}
      </nav>
      {item && <div className="space-y-3 rounded-md border border-ink/15 p-5">
        <h2 className="font-semibold">{item.stem[lang]}</h2>
        {eventFor(item.item_id) && <p className="text-sm">{copy("Already seen. Another answer is practice of the same item; your first answer stays recorded.",
          "Nakita na ito. Ang panibagong sagot ay pag-uulit ng parehong tanong; mananatiling naitala ang una mong sagot.")}</p>}
        <fieldset disabled={busy} className="space-y-2"><legend className="sr-only">{copy("Choose an answer", "Pumili ng sagot")}</legend>
          {item.options.map(option => <label key={option.id} className="flex min-h-11 items-center gap-3 rounded-md border border-ink/15 p-3">
            <input type="radio" name={`practice-${item.item_id}`} checked={kind === "choice" && optionId === option.id}
              onChange={() => { setKind("choice"); setOptionId(option.id); }} />{option.label[lang]}</label>)}
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-ink/15 p-3">
            <input type="radio" name={`practice-${item.item_id}`} checked={kind === "unknown"}
              onChange={() => { setKind("unknown"); setOptionId(null); }} />{copy("I don't know yet", "Hindi ko pa alam")}</label>
        </fieldset>
        <button className={button} disabled={busy || !kind} onClick={() => void commit()}>{copy("Check answer", "Suriin ang sagot")}</button>
        {feedback?.item_id === item.item_id && <div role="status" className="space-y-2 rounded-md bg-ink/5 p-4">
          <p className="font-semibold">{feedback.correct ? copy("Correct", "Tama") : copy("Review this idea", "Balikan ang ideyang ito")}</p>
          <p>{feedback.feedback.rationale[lang]}</p>
          {feedback.feedback.distractor_rationale && <p>{feedback.feedback.distractor_rationale[lang]}</p>}
        </div>}
      </div>}
      {practice.state === "completed" && <p>{copy("Checkpoint complete. You can try a fresh alternate or return to the chapter.",
        "Tapos na ang maikling pagsasanay. Maaari kang sumubok ng bagong alternatibo o bumalik sa kabanata.")}</p>}
    </>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    <Link className="block underline" href={chapterHref}>{copy("Back to chapter", "Bumalik sa kabanata")}</Link>
  </section>;
}

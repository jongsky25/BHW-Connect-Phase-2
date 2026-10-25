"use client";

import Link from "next/link";
import {AssessmentLanguageNotice} from "./assessment-language-notice";
import { useEffect, useRef, useState } from "react";
import { NotesMarkdown } from "@/components/elearning/notes-markdown";
import { createClient } from "@/lib/supabase/client";

type Text = { en: string; fil: string };
type Item = { item_id: string; slot: string; stem: Text; options: { id: string; label: Text }[]; lesson_keys: string[] };
type Response = { item_id: string; kind: "choice" | "unknown"; option_id: string | null; marked: boolean };
type Attempt = { attempt_id: string; phase: "pretest" | "posttest"; state: "draft" | "submitted";
  revision: number; position: number; language: "en" | "fil"; items: Item[]; responses: Response[];
  score_percent: number | null; legacy_attempt_id: string | null };
type Summary = { attempt_id: string; phase: "pretest" | "posttest"; state: string;
  score_percent: number | null; legacy_attempt_id: string | null };
type State = { attempts: Summary[]; final_attempts: { id: string; phase: string; score_percent: number }[] };
type Orientation = { expectations: Text; overview: Text; recap: Text };
type Stage = "entry" | "overview" | "recap" | "questions" | "review" | "result";

export function Chapter1Assessment({ courseId, chapterHref, locale, sessionId, completed,
  initialState, orientation, contentApproved, assessor = false }: {
  courseId: string; chapterHref: string; locale: string; sessionId: string | null;
  completed: boolean; initialState: State; orientation: Orientation; contentApproved: boolean;
  assessor?: boolean;
}) {
  const lang = locale === "en" ? "en" : "fil";
  const copy = (en: string, fil: string) => lang === "en" ? en : fil;
  const [state, setState] = useState(initialState);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [stage, setStage] = useState<Stage>("entry");
  const [position, setPosition] = useState(0);
  const [pending, setPending] = useState<Response | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const pendingOperation = useRef<{ payload: string; mutationId: string } | null>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (stage === "questions") questionHeading.current?.focus();
    if (stage === "review") reviewHeading.current?.focus();
  }, [position, stage]);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  const pre = state.attempts.find(a => a.phase === "pretest" && a.state === "submitted") ??
    state.final_attempts.find(a => a.phase === "pretest");
  const post = [...state.attempts].reverse().find(a => a.phase === "posttest" && a.state === "submitted") ??
    state.final_attempts.find(a => a.phase === "posttest");
  const postPassed = !assessor || Boolean(post && (post.score_percent ?? 0) >= 80);
  const reviewHref = (id: string) => `/courses/${courseId}/assessment/review/${id}`;
  const phase: "pretest" | "posttest" = pre ? "posttest" : "pretest";
  const current = attempt?.items[position];
  const response = pending?.item_id === current?.item_id ? pending :
    attempt?.responses.find(r => r.item_id === current?.item_id);
  const savedResponses = new Set(attempt?.responses.map(r => r.item_id));
  const responded = new Set(savedResponses);
  if (pending && attempt) responded.add(pending.item_id);
  const unanswered = attempt?.items.filter(item => !responded.has(item.item_id)) ?? [];
  const responseByItem = new Map(attempt?.responses.map(r => [r.item_id, r]));
  const savedUnanswered = attempt?.items.filter(item => !responseByItem.has(item.item_id)) ?? [];
  const choiceCount = attempt?.items.filter(item => responseByItem.get(item.item_id)?.kind === "choice").length ?? 0;
  const unknownCount = attempt?.items.filter(item => responseByItem.get(item.item_id)?.kind === "unknown").length ?? 0;
  const marked = attempt?.items.filter(item => responseByItem.get(item.item_id)?.marked) ?? [];
  const total = attempt?.items.length ?? 30;
  const responsesSaved = choiceCount + unknownCount;
  const atLastQuestion = position === total - 1;
  const allResponsesSaved = responsesSaved === total && !pending;

  async function refreshState() {
    const { data, error: requestError } = await createClient().rpc("rpc_learner_assessment_state", { p_course_id: courseId });
    if (requestError) throw requestError;
    setState(data as State);
  }

  async function resume(id: string) {
    setBusy(true); setError(null);
    try {
      const { data, error: requestError } = await createClient().rpc("rpc_learner_assessment_get", { p_attempt_id: id });
      if (requestError) throw requestError;
      const next = data as Attempt;
      setAttempt(next); setPosition(next.position); setPending(null); pendingOperation.current = null;
      setStage(next.state === "submitted" ? "result" : "questions");
    } catch {
      setError(copy("We could not load your saved assessment. Please try again.", "Hindi makuha ang naka-save na pagtatasa. Subukan muli."));
    } finally { setBusy(false); }
  }

  async function start() {
    if (!contentApproved) return;
    setBusy(true); setError(null);
    try {
      const { data, error: requestError } = await createClient().rpc("rpc_learner_assessment_start", {
        p_course_id: courseId, p_phase: phase, p_session_id: sessionId,
      });
      if (requestError) throw requestError;
      if ((data as { state?: string })?.state === "legacy_submitted") { await refreshState(); setStage("entry"); return; }
      const next = data as Attempt;
      setAttempt(next); setPosition(next.position); pendingOperation.current = null; setStage(next.state === "submitted" ? "result" : "questions");
      await refreshState();
    } catch {
      setError(copy("Assessment is temporarily unavailable. Your previous results remain available.",
        "Pansamantalang hindi magamit ang pagtatasa. Maaari mo pa ring makita ang dati mong resulta."));
    } finally { setBusy(false); }
  }

  async function save(next: Response, nextPosition = position) {
    if (!attempt || attempt.state !== "draft") return false;
    setPending(next); setSaved(false); setBusy(true); setError(null);
    const payload = JSON.stringify({ attemptId: attempt.attempt_id, changes: [next], nextPosition, revision: attempt.revision, lang });
    if (pendingOperation.current?.payload !== payload) pendingOperation.current = { payload, mutationId: crypto.randomUUID() };
    try {
      const { data, error: requestError } = await createClient().rpc("rpc_learner_assessment_save", {
        p_attempt_id: attempt.attempt_id, p_expected_revision: attempt.revision,
        p_mutation_id: pendingOperation.current.mutationId, p_changes: [next],
        p_position: nextPosition, p_language: lang,
      });
      if (requestError) throw requestError;
      setAttempt(data as Attempt); setPosition(nextPosition); setPending(null); pendingOperation.current = null; setSaved(true);
      return true;
    } catch {
      setError(copy("This change is not saved. Retry, or reload to compare with the saved draft.",
        "Hindi naka-save ang pagbabagong ito. Subukan muli, o i-reload upang ihambing sa naka-save na draft."));
      return false;
    } finally { setBusy(false); }
  }

  async function move(nextPosition: number) {
    if (!attempt || busy) return false;
    if (pending) return save(pending, nextPosition);
    else {
      setBusy(true); setSaved(false); setError(null);
      // A lost response may follow a committed save. Retry the same mutation
      // so the server returns its receipt instead of rejecting a stale revision.
      const payload = JSON.stringify({ attemptId: attempt.attempt_id, changes: [], nextPosition, revision: attempt.revision, lang });
      if (pendingOperation.current?.payload !== payload) pendingOperation.current = { payload, mutationId: crypto.randomUUID() };
      try {
        const { data, error: requestError } = await createClient().rpc("rpc_learner_assessment_save", {
          p_attempt_id: attempt.attempt_id, p_expected_revision: attempt.revision,
          p_mutation_id: pendingOperation.current.mutationId, p_changes: [], p_position: nextPosition, p_language: lang,
        });
        if (requestError) throw requestError;
        setAttempt(data as Attempt); setPosition(nextPosition); pendingOperation.current = null; setSaved(true);
        return true;
      } catch {
        setError(copy("Position was not saved. Retry or reload your draft.", "Hindi naka-save ang posisyon. Subukan muli o i-reload ang draft."));
        return false;
      } finally { setBusy(false); }
    }
  }

  async function submit() {
    if (!attempt || pending || unanswered.length || busy) return;
    if (!window.confirm(copy("Submit all 30 answers? You cannot change them afterward.",
      "Isumite ang lahat ng 30 sagot? Hindi na ito mababago pagkatapos."))) return;
    setBusy(true); setError(null);
    const client = createClient();
    try {
      const { error: requestError } = await client.rpc("rpc_learner_assessment_submit", {
        p_attempt_id: attempt.attempt_id, p_expected_revision: attempt.revision,
        p_mutation_id: crypto.randomUUID(),
      });
      if (requestError) throw requestError;
      const { data, error: getError } = await client.rpc("rpc_learner_assessment_get", { p_attempt_id: attempt.attempt_id });
      if (getError) throw getError;
      setAttempt(data as Attempt); setStage("result"); await refreshState();
    } catch {
      const { data } = await client.rpc("rpc_learner_assessment_get", { p_attempt_id: attempt.attempt_id });
      if ((data as Attempt | null)?.state === "submitted") {
        setAttempt(data as Attempt); setStage("result"); await refreshState();
      } else {
        setError(copy("Submission is not confirmed. Your saved draft is still available. Please retry.",
          "Hindi pa kumpirmado ang pagsusumite. Nariyan pa ang naka-save na draft. Subukan muli."));
      }
    } finally { setBusy(false); }
  }

  async function openQuestion(itemId: string) {
    if (!attempt) return;
    const index = attempt.items.findIndex(item => item.item_id === itemId);
    if (index >= 0 && await move(index)) setStage("questions");
  }

  const button = "min-h-11 rounded-md border border-ink/20 px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50";
  const questionButton = (answered: boolean, active = false) =>
    `min-h-11 min-w-11 rounded-md border px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 ${answered
      ? "border-success bg-success/15"
      : "border-warning bg-warning/15"} ${active ? "ring-2 ring-primary ring-offset-2" : ""}`;
  const questionLegend = <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink">
    <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm border border-success bg-success/15" />{copy("Answered", "May sagot")}</span>
    <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm border border-warning bg-warning/15" />{copy("Not done", "Wala pang sagot")}</span>
  </p>;
  const responseSummary = <p className="text-sm text-ink/80">
    {copy(`${choiceCount} answered · ${unknownCount} don't know yet · ${savedUnanswered.length} unanswered · ${marked.length} marked for review`,
      `${choiceCount} may sagot · ${unknownCount} hindi pa alam · ${savedUnanswered.length} walang sagot · ${marked.length} minarkahang balikan`)}
  </p>;
  const finishInstructions = <aside aria-label={copy("How to finish", "Paano tapusin")} className="rounded-lg border border-primary/25 bg-primary/5 p-4">
    <p className="font-semibold">{copy("How to finish", "Paano tapusin")}</p>
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
      <li>{copy("Choose an answer or “I don't know yet” for every question. You can move between questions.", "Pumili ng sagot o “Hindi ko pa alam” sa bawat tanong. Maaari kang lumipat sa mga tanong.")}</li>
      <li>{copy("Choose “Review all” to check your saved responses and any questions marked for review.", "Piliin ang “Balikan ang lahat” upang suriin ang naka-save na sagot at mga tanong na minarkahang balikan.")}</li>
      <li>{copy("Choose “Submit assessment”, then confirm. Reaching the last question does not submit your answers.", "Piliin ang “Isumite ang pagtatasa”, saka kumpirmahin. Hindi pa naipapasa ang mga sagot pagdating sa huling tanong.")}</li>
    </ol>
  </aside>;
  if (stage === "questions" && attempt && current) return (
    <section className="space-y-5" aria-label={copy("Assessment questions", "Mga tanong sa pagtatasa")}>
      <div role="status" aria-live="polite" className="text-sm text-ink/70">
        {copy(`Section ${Math.floor(position / 10) + 1} of 3 · Question ${position + 1} of 30`,
          `Bahagi ${Math.floor(position / 10) + 1} sa 3 · Tanong ${position + 1} sa 30`)} · {pending ? copy("Unsaved", "Hindi pa naka-save") : saved ? copy("Saved", "Naka-save") : copy("Saved draft", "Naka-save na draft")} · {copy(`${responsesSaved}/${total} responses saved`, `${responsesSaved}/${total} sagot ang naka-save`)}
      </div>
      <p className="text-sm">{copy("Answer questions → Review all → Submit and confirm. You can change saved answers before submitting.", "Sagutan ang mga tanong → Balikan ang lahat → Isumite at kumpirmahin. Maaari pang baguhin ang naka-save na sagot bago isumite.")}</p>
      <progress aria-label={copy("Saved responses", "Mga naka-save na sagot")} className="h-3 w-full accent-primary" max={total} value={responsesSaved} />
      {responseSummary}
      <h1 ref={questionHeading} tabIndex={-1} className="text-xl font-semibold">{current.stem[lang]}</h1>
      <fieldset disabled={busy} className="space-y-3">
        <legend className="sr-only">{copy("Choose one answer", "Pumili ng isang sagot")}</legend>
        {current.options.map(option => <label key={option.id} className="flex min-h-11 items-center gap-3 rounded-md border border-ink/15 p-3">
          <input type="radio" name={`assessment-${current.item_id}`} checked={response?.kind === "choice" && response.option_id === option.id}
            onChange={() => void save({ item_id: current.item_id, kind: "choice", option_id: option.id, marked: response?.marked ?? false })} />
          {option.label[lang]}
        </label>)}
        <label className="flex min-h-11 items-center gap-3 rounded-md border border-ink/15 p-3">
          <input type="radio" name={`assessment-${current.item_id}`} checked={response?.kind === "unknown"}
            onChange={() => void save({ item_id: current.item_id, kind: "unknown", option_id: null, marked: response?.marked ?? false })} />
          {copy("I don't know yet", "Hindi ko pa alam")}
        </label>
      </fieldset>
      <button className={button} disabled={busy || !response} onClick={() => response && void save({ ...response, marked: !response.marked })}>
        {response?.marked ? copy("Remove review mark", "Alisin ang marka") : copy("Mark for review", "Markahan para balikan")}
      </button>
      {error && <p role="alert" className="text-danger">{error} {pending && <button className="underline" onClick={() => void save(pending)}>{copy("Retry save", "Subukang i-save muli")}</button>}</p>}
      {(atLastQuestion || allResponsesSaved) && <p className="rounded-lg border border-primary/25 bg-primary/5 p-4">
        {allResponsesSaved
          ? copy(`All ${total} responses are saved. Choose “Review all” to check them before submitting.`, `Naka-save na ang lahat ng ${total} sagot. Piliin ang “Balikan ang lahat” upang suriin bago isumite.`)
          : copy("You have reached the last question. Choose “Review all” to find questions that still need a response before submitting.", "Nasa huling tanong ka na. Piliin ang “Balikan ang lahat” upang makita ang mga kailangan pang sagutan bago isumite.")}
      </p>}
      <nav className="flex flex-wrap gap-2" aria-label={copy("Question navigation", "Paglipat sa mga tanong")}>
        <button className={button} disabled={busy || position === 0} onClick={() => void move(position - 1)}>{copy("Previous", "Nakaraan")}</button>
        {!atLastQuestion && <button className={button} disabled={busy} onClick={() => void move(position + 1)}>{copy("Next", "Susunod")}</button>}
        <button className={`${button} ${atLastQuestion || allResponsesSaved ? "border-primary bg-primary text-on-primary" : ""}`} disabled={busy || Boolean(pending)} onClick={() => setStage("review")}>{copy("Review all", "Balikan ang lahat")}</button>
      </nav>
      {questionLegend}
      <div className="flex flex-wrap gap-1" aria-label={copy("Jump to question", "Pumunta sa tanong")}>
        {attempt.items.map((item, i) => <button key={item.item_id} className={questionButton(savedResponses.has(item.item_id), i === position)} disabled={busy}
          aria-label={copy(`Question ${i + 1}, ${pending?.item_id === item.item_id ? 'unsaved' : savedResponses.has(item.item_id) ? 'answered' : 'unanswered'}`,
            `Tanong ${i + 1}, ${pending?.item_id === item.item_id ? 'hindi pa naka-save' : savedResponses.has(item.item_id) ? 'may sagot' : 'walang sagot'}`)}
          aria-current={i === position ? "step" : undefined} onClick={() => void move(i)}>{i + 1}</button>)}
      </div>
      <Link className="underline" href={chapterHref} onClick={event => {
        if (busy) { event.preventDefault(); setError(copy("Wait for the current save before leaving.", "Hintaying matapos ang pag-save bago umalis.")); }
        else if (pending) { event.preventDefault(); setError(copy("Retry the unsaved change before leaving.", "Subukang i-save muli ang hindi pa na-save na pagbabago bago umalis.")); }
      }}>{copy("Save and leave", "I-save at umalis")}</Link>
    </section>
  );

  if (stage === "review" && attempt) return <section className="space-y-4">
    <h1 ref={reviewHeading} tabIndex={-1} className="text-2xl font-semibold">{copy("Review before submitting", "Balikan bago isumite")}</h1>
    <p>{copy(`${unanswered.length} unanswered. Choose an answer or “I don't know yet” for every question.`,
      `${unanswered.length} ang walang sagot. Pumili ng sagot o “Hindi ko pa alam” sa bawat tanong.`)}</p>
    {responseSummary}
    {savedUnanswered.length === 0 && <p className="rounded-lg border border-primary/25 bg-primary/5 p-4">{copy("Every question has a saved response. Check any review marks, then choose “Submit assessment” when ready. You will be asked to confirm.", "May naka-save na sagot na ang bawat tanong. Suriin ang mga markang babalikan, saka piliin ang “Isumite ang pagtatasa” kapag handa na. Hihingan ka ng kumpirmasyon.")}</p>}
    <div className="flex flex-wrap gap-2">
      {savedUnanswered[0] && <button className={button} disabled={busy} onClick={() => void openQuestion(savedUnanswered[0].item_id)}>{copy("Go to first unanswered", "Pumunta sa unang walang sagot")}</button>}
      {marked[0] && <button className={button} disabled={busy} onClick={() => void openQuestion(marked[0].item_id)}>{copy("Go to first review mark", "Pumunta sa unang minarkahan")}</button>}
    </div>
    {questionLegend}
    <ol className="grid max-w-[32rem] grid-cols-[repeat(auto-fit,minmax(2.75rem,1fr))] gap-2">{attempt.items.map((item, i) => {
      const answer = attempt.responses.find(r => r.item_id === item.item_id);
      return <li key={item.item_id}><button className={`${questionButton(Boolean(answer))} w-full`} disabled={busy} onClick={async () => {
        if (await move(i)) setStage("questions");
      }}>
        {i + 1}<span className="sr-only">: {answer?.kind === "unknown" ? copy("unknown", "hindi alam") : answer ? copy("answered", "may sagot") : copy("unanswered", "walang sagot")}{answer?.marked ? `, ${copy("marked", "minarkahan")}` : ""}</span>
      </button></li>;
    })}</ol>
    {error && <p role="alert" className="text-danger">{error}</p>}
    <button className={`${button} border-primary bg-primary text-on-primary`} disabled={busy || unanswered.length > 0} onClick={() => void submit()}>{copy("Submit assessment", "Isumite ang pagtatasa")}</button>
    <button className={button} disabled={busy} onClick={() => setStage("questions")}>{copy("Back to questions", "Bumalik sa mga tanong")}</button>
  </section>;

  if (stage === "result" && attempt) return <section className="space-y-4">
    <h1 className="text-2xl font-semibold">{copy("Assessment submitted", "Naisumite ang pagtatasa")}</h1>
    <p>{copy("Score", "Iskor")}: {attempt.score_percent}%</p>
    <Link prefetch={false} href="/my-results" className="inline-flex min-h-11 items-center font-medium underline">{copy("View my test results and history", "Tingnan ang aking mga resulta at history")}</Link>
    {assessor && attempt.phase === "posttest" && <p>{(attempt.score_percent ?? 0) >= 80
      ? copy("Passed. You can continue to scoring orientation.", "Pumasa. Maaari ka nang magpatuloy sa oryentasyon sa pagmamarka.")
      : copy("80% is required before scoring orientation. Review the chapter and retry the post-test.",
        "Kailangan ang 80% bago ang oryentasyon sa pagmamarka. Balikan ang kabanata at ulitin ang post-test.")}</p>}
    {attempt.phase === "pretest" ? <p>{copy("This is your starting point. Study the chapter to see what you can revisit; answer keys are not shown for the baseline.",
      "Ito ang iyong panimulang punto. Pag-aralan ang kabanata upang makita ang dapat balikan; hindi ipinapakita ang mga tamang sagot sa baseline.")}</p> :
      attempt.legacy_attempt_id && <Link className="underline" href={reviewHref(attempt.legacy_attempt_id)}>
        {copy("Review my post-test", "Balikan ang aking post-test")}</Link>}
    {assessor && attempt.phase === "posttest" && (attempt.score_percent ?? 0) < 80 &&
      <button className={button} onClick={() => {setAttempt(null); setStage("entry");}}>
        {copy("Retry post-test", "Ulitin ang post-test")}</button>}
    {assessor && attempt.phase === "posttest" && (attempt.score_percent ?? 0) >= 80 &&
      <Link className="block underline" href={`${chapterHref}/orientation`}>
        {copy("Continue to scoring orientation", "Magpatuloy sa oryentasyon sa pagmamarka")}</Link>}
    <Link className="block underline" href={chapterHref}>{copy("Back to chapter", "Bumalik sa kabanata")}</Link>
  </section>;

  const draft = state.attempts.find(a => a.phase === phase && a.state === "draft");
  return <section className="space-y-5">
    <h1 className="text-2xl font-semibold">{copy("Chapter 1 assessment", "Pagtatasa sa Kabanata 1")}</h1>
    {stage === "entry" && <AssessmentLanguageNotice en={lang === "en"}/>}
    <Link prefetch={false} href="/my-results" className="inline-flex min-h-11 items-center font-medium underline">{copy("View my test results and history", "Tingnan ang aking mga resulta at history")}</Link>
    {finishInstructions}
    {pre && <p>{copy("Baseline submitted", "Naisumite na ang baseline")}: {pre.score_percent}%</p>}
    {post && <p>{copy("Post-test submitted", "Naisumite na ang post-test")}: {post.score_percent}%</p>}
    {state.attempts.filter(a => a.state === "submitted" && a.phase === "posttest" && a.legacy_attempt_id).map(a =>
      <Link key={a.attempt_id} className="block underline" href={reviewHref(a.legacy_attempt_id!)}>
        {copy("Review my post-test", "Balikan ang aking post-test")}</Link>)}
    {state.final_attempts.filter(a => a.phase === "posttest" &&
      !state.attempts.some(versioned => versioned.legacy_attempt_id === a.id)).map(a =>
      <Link key={a.id} className="block underline" href={reviewHref(a.id)}>
        {copy("Review historical post-test", "Balikan ang dating post-test")}</Link>)}
    {draft ? <button className={button} disabled={busy} onClick={() => void resume(draft.attempt_id)}>
      {copy(`Resume ${phase}`, `Ipagpatuloy ang ${phase}`)}</button> : (!post || !postPassed) && (phase === "pretest" || completed) ? <>
      {stage === "entry" && !pre && <><NotesMarkdown markdown={orientation.expectations[lang]} />
        <button className={button} onClick={() => setStage("overview")}>{copy("Continue to chapter overview", "Magpatuloy sa buod ng kabanata")}</button></>}
      {stage === "overview" && !pre && <><NotesMarkdown markdown={orientation.overview[lang]} />
        <button className={button} disabled={busy || !contentApproved} onClick={() => void start()}>{copy("Begin baseline", "Simulan ang baseline")}</button></>}
      {stage === "entry" && pre && <><NotesMarkdown markdown={orientation.recap[lang]} />
        <button className={button} onClick={() => setStage("recap")}>{copy("Continue to post-test", "Magpatuloy sa post-test")}</button></>}
      {stage === "recap" && pre && <button className={button} disabled={busy || !contentApproved} onClick={() => void start()}>{copy("Begin post-test", "Simulan ang post-test")}</button>}
    </> : !post && <p>{copy("Complete the chapter before the post-test.", "Tapusin muna ang kabanata bago ang post-test.")}</p>}
    {!contentApproved && !draft && !post && <p role="status">{copy("The new assessment content is awaiting review.", "Hinihintay pa ang pagsusuri ng nilalaman ng bagong pagtatasa.")}</p>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    <Link className="block underline" href={chapterHref}>{copy("Back to chapter", "Bumalik sa kabanata")}</Link>
  </section>;
}

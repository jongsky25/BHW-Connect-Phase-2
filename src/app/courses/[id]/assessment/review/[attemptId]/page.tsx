import Link from "next/link";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { reviewRawScore } from "@/lib/elearning/test-results";

type Text = { en: string; fil: string };
type Item = { item_id: string; slot: string; stem: Text; rationale: Text;
  correct_option_id: string; lesson_keys: string[];
  options: { id: string; label: Text; distractor_rationale?: Text }[] };
type Review = { score_percent: number; form_id: string; release_id: string;
  items: Item[]; responses: { item_id: string; kind: "choice" | "unknown"; option_id: string | null }[] };
type LegacyReview = { generation: "legacy" | "legacy_assessor"; score_percent: number; form_membership_known: boolean;
  entries: { question_id: string | null; status: string; prompt_fil: string | null; prompt_en: string | null;
    options: Text[] | null; selected_option_index: number | null; correct_option_index: number | null;
    matches_stored_key: boolean | null }[] };

export default async function Chapter1PostReviewPage({ params, searchParams }: {
  params: Promise<{ id: string; attemptId: string }>;
  searchParams?: Promise<{ view?: string }>;
}) {
  const { id, attemptId } = await params;
  const viewer = await getViewer();
  if (!viewer.appUser || viewer.appUser.status !== "active") redirect("/login");
  if (viewer.role !== "bhw" && viewer.role !== "assessor") notFound();
  const db = await createClient();
  const [{ data: mapping }, { data, error }, locale] = await Promise.all([
    db.from("training_program_chapters").select("program_id,chapter_key")
      .eq("course_id", id).eq("chapter_key", "chapter-1").maybeSingle(),
    db.rpc("rpc_learner_assessment_review", { p_final_attempt_id: attemptId }),
    getLocale(),
  ]);
  if (!mapping) notFound();
  const legacy = (error || !data)
    ? await db.rpc(viewer.role === "assessor" ? "rpc_legacy_assessor_posttest_review" : "rpc_legacy_posttest_review",
      { p_final_attempt_id: attemptId }) : null;
  if ((!data || error) && (!legacy?.data || legacy.error)) notFound();
  const lang = locale === "en" ? "en" : "fil";
  const copy = (en: string, fil: string) => lang === "en" ? en : fil;
  const chapterHref = viewer.role === "assessor"
    ? `/training/${mapping.program_id}/assessor/chapter-1`
    : `/training/${mapping.program_id}/chapter-1`;
  if (legacy?.data) {
    const historical = legacy.data as LegacyReview;
    return <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">{copy("Historical post-test review", "Pagsuri sa dating post-test")}</h1>
      <Link prefetch={false} href="/my-results" className="inline-flex min-h-[44px] items-center underline">{copy("← My test results", "← Aking mga resulta sa pagsusulit")}</Link>
      <p>{copy("Stored final score", "Naka-save na huling iskor")}: {historical.score_percent}%</p>
      <p className="rounded-md border border-ink/20 p-4">{historical.form_membership_known ? copy(
        "These questions come from your saved post-test form. Your recorded choices and the stored keys are shown below. Authored explanations were not saved for this older form; your stored score is unchanged.",
        "Mula sa naka-save mong post-test form ang mga tanong na ito. Nasa ibaba ang naitala mong mga sagot at ang naka-save na mga tamang sagot. Walang na-save na paliwanag para sa lumang form na ito; hindi nagbago ang naka-save mong iskor.") : copy(
        "The original served form and scoring membership were not saved. The entries below show recoverable recorded responses and the stored key. Missing entries cannot be counted as wrong, and a key match does not prove that the response contributed to the stored score. Explanations for these historical items are not available yet.",
        "Hindi naitala ang orihinal na form at kung aling mga tanong ang kasama sa pagmamarka. Ipinapakita sa ibaba ang mga naitalang sagot na mababawi at ang naka-save na tamang sagot. Hindi maaaring ituring na mali ang mga nawawalang tala, at ang pagtugma sa tamang sagot ay hindi patunay na naisama ito sa naka-save na iskor. Wala pang paliwanag para sa mga dating tanong na ito.")}</p>
      <ol className="space-y-4">{historical.entries.map((entry, i) => {
        const selected = entry.selected_option_index === null ? null : entry.options?.[entry.selected_option_index];
        const correct = entry.correct_option_index === null ? null : entry.options?.[entry.correct_option_index];
        return <li key={`${entry.question_id ?? "missing"}-${i}`} className="space-y-2 rounded-md border border-ink/15 p-4">
          <h2 className="font-semibold">{i + 1}. {(lang === "en" ? entry.prompt_en : entry.prompt_fil) ?? copy("Original question unavailable", "Wala na ang orihinal na tanong")}</h2>
          {entry.status !== "recoverable" && <p>{entry.status === "duplicate_response" ? copy("Duplicate or conflicting saved responses; scoring provenance is incomplete.", "May doblado o magkasalungat na tala; hindi kumpleto ang batayan ng pagmamarka.") :
            entry.status === "original_question_unavailable" ? copy("Original question unavailable.", "Wala na ang orihinal na tanong.") :
              copy("No valid recorded selection available.", "Walang makuhang wastong naitalang pagpili.")}</p>}
          <p>{copy("Your saved choice", "Naka-save mong pinili")}: {selected?.[lang] ?? copy("No recorded response available", "Walang makuhang naitalang sagot")}</p>
          {correct && <p>{copy("Stored key", "Naka-save na tamang sagot")}: {correct[lang]}</p>}
          {entry.matches_stored_key !== null && <p>{entry.matches_stored_key ? copy("Your saved choice matches the stored key.", "Tumutugma ang na-save mong pinili sa naka-save na tamang sagot.") :
            copy("Your saved choice does not match the stored key.", "Hindi tumutugma ang na-save mong pinili sa naka-save na tamang sagot.")}</p>}
        </li>;
      })}</ol>
      <Link className="underline" href={chapterHref}>{copy("Back to chapter", "Bumalik sa kabanata")}</Link>
    </main>;
  }
  const review = data as Review;
  const raw = reviewRawScore(review.items, review.responses, review.score_percent);
  const needsReview = (item: Item) => {
    const response = review.responses.find(row => row.item_id === item.item_id);
    return response?.kind !== "choice" || response.option_id !== item.correct_option_id;
  };
  const remaining = review.items.filter(needsReview).length;
  const filtered = (await searchParams)?.view === "needs-review";
  const { data: lessons } = await db.from("course_lessons")
    .select("id,module_id,lesson_key,course_modules!inner(course_id)")
    .eq("course_modules.course_id", id).in("lesson_key", review.items.flatMap(item => item.lesson_keys));
  const lessonByKey = new Map((lessons ?? []).map(lesson => [lesson.lesson_key, lesson]));
  return <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6">
    <h1 className="text-2xl font-semibold">{copy("My Chapter 1 post-test review", "Pagsuri sa aking post-test sa Kabanata 1")}</h1>
    <Link prefetch={false} className="inline-flex min-h-[44px] items-center underline" href="/my-results">{copy("← My test results", "← Aking mga resulta sa pagsusulit")}</Link>
    {raw && <p className="text-xl font-semibold">{copy(`${raw.correct}/${raw.total} correct`, `${raw.correct}/${raw.total} tama`)}</p>}
    <p>{copy("Score", "Iskor")}: {review.score_percent}% · {copy("Form", "Form")}: {review.form_id}</p>
    <p className="text-sm text-ink/70">{copy("Practical performance is assessed separately. These explanations help you decide what to revisit.",
      "Hiwalay na tinatasa ang praktikal na pagganap. Makatutulong ang mga paliwanag na ito sa pagpili ng babalikan.")}</p>
    <nav aria-label={copy("Review filter", "Filter ng pagsuri")} className="flex flex-wrap gap-4">
      <Link prefetch={false} href="?view=all" aria-current={!filtered ? "page" : undefined} className="inline-flex min-h-[44px] items-center underline">{copy(`All questions (${review.items.length})`, `Lahat ng tanong (${review.items.length})`)}</Link>
      <Link prefetch={false} href="?view=needs-review" aria-current={filtered ? "page" : undefined} className="inline-flex min-h-[44px] items-center underline">{copy(`Needs review (${remaining})`, `Dapat balikan (${remaining})`)}</Link>
    </nav>
    {filtered && remaining === 0 && <p>{copy("Every response matched the saved key in this attempt.", "Tumutugma sa naka-save na tamang sagot ang bawat sagot sa pagsubok na ito.")}</p>}
    <ol className="space-y-6">{review.items.map((item, i) => {
      if (filtered && !needsReview(item)) return null;
      const response = review.responses.find(row => row.item_id === item.item_id);
      const correct = item.options.find(option => option.id === item.correct_option_id);
      const selected = item.options.find(option => option.id === response?.option_id);
      const matched = response?.kind === "choice" && response.option_id === item.correct_option_id;
      return <li id={`review-item-${item.item_id}`} value={i + 1} key={item.item_id} className="space-y-3 rounded-lg border border-ink/15 p-5">
        <h2 className="font-semibold">{i + 1}. {item.stem[lang]}</h2>
        <p className="font-medium">{matched ? copy("Correct", "Tama") : response?.kind === "unknown" ?
          copy("You chose ‘I don't know yet’", "Pinili mo ang ‘Hindi ko pa alam’") : copy("Needs review", "Dapat balikan")}</p>
        <p>{copy("Your response", "Iyong sagot")}: {response?.kind === "unknown" ? copy("I don't know yet", "Hindi ko pa alam") :
          selected?.label[lang] ?? copy("No recorded response", "Walang naitalang sagot")}</p>
        <p>{copy("Correct response", "Tamang sagot")}: {correct?.label[lang]}</p>
        <p>{item.rationale[lang]}</p>
        {selected && !matched && selected.distractor_rationale && <p>{selected.distractor_rationale[lang]}</p>}
        <div className="flex flex-wrap gap-3 text-sm">{item.lesson_keys.map(key => {
          const lesson = lessonByKey.get(key);
          return lesson ? <Link key={key} className="underline" href={`${chapterHref}/${lesson.module_id}/${lesson.id}`}>
            {copy("Review lesson", "Balikan ang aralin")}: {key}</Link> : <span key={key}>{key}</span>;
        })}</div>
      </li>;
    })}</ol>
    <Link className="underline" href={chapterHref}>
      {copy("Back to chapter", "Bumalik sa kabanata")}</Link>
  </main>;
}

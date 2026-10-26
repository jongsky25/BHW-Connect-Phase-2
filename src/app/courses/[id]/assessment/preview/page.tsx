import Link from "next/link";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Chapter1LearningNotes } from "@/components/elearning/chapter1-learning-notes";
import { NotesMarkdown } from "@/components/elearning/notes-markdown";
import { getViewer } from "@/lib/auth/viewer";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";
import orientation from "../../../../../../content/training/day1-basic-competencies/learner-assessment-v2/orientation.json";
import checkpoints from "../../../../../../content/training/day1-basic-competencies/learner-assessment-v2/checkpoints.json";
import release from "../../../../../../content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-resource-monitor-v6/release.json";

type Section = "overview" | "pretest" | "posttest" | "practice" | "notes";

export default async function Chapter1AdminPreview({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ phase?: string; part?: string; group?: string }>;
}) {
  const [{ id }, query, viewer, flags, locale] = await Promise.all([
    params, searchParams, getViewer(), getRequestFeatureFlags(), getLocale(),
  ]);
  if (!viewer.appUser || viewer.appUser.status !== "active") redirect("/login");
  if (viewer.appUser.role !== "admin" || !viewer.isPreview || viewer.role !== "bhw") notFound();
  if (!flags.elearning || !flags.chapter1_assessment_v2 || orientation.editorial_status !== "approved") notFound();
  const db = await createClient();
  const { data: mapping, error } = await db.from("training_program_chapters")
    .select("program_id,chapter_key,training_programs!inner(content_key,status)")
    .eq("course_id", id).eq("chapter_key", "chapter-1").eq("availability", "available")
    .eq("training_programs.content_key", "bhw-reference-manual")
    .eq("training_programs.status", "published").maybeSingle();
  if (error || !mapping) notFound();

  const section: Section = ["overview", "pretest", "posttest", "practice", "notes"].includes(query.phase ?? "")
    ? query.phase as Section : "overview";
  const part = ["1", "2", "3"].includes(query.part ?? "") ? Number(query.part) : 1;
  const group = checkpoints.find(row => row.key === query.group) ?? checkpoints[0];
  const lang = locale === "en" ? "en" : "fil";
  const copy = (en: string, fil: string) => lang === "en" ? en : fil;
  const base = `/courses/${id}/assessment/preview`;
  const chapterHref = `/training/${mapping.program_id}/chapter-1`;
  const tabs: { key: Section; en: string; fil: string }[] = [
    { key: "overview", en: "Introduction and recap", fil: "Panimula at paglalagom" },
    { key: "pretest", en: "Pre-test", fil: "Pre-test" },
    { key: "posttest", en: "Post-test", fil: "Post-test" },
    { key: "practice", en: "Practice", fil: "Pagsasanay" },
    { key: "notes", en: "Learning notes", fil: "Mga tala sa pagkatuto" },
  ];
  const form = section === "pretest" || section === "posttest" ? release.forms[section] : null;
  const items = form?.items.slice((part - 1) * 10, part * 10) ?? [];
  const practice = release.checkpoints.find(row => row.key === group.key);

  return <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-10 sm:px-6">
    <Link className="underline" href={chapterHref}>{copy("← Chapter 1 outline", "← Balangkas ng Kabanata 1")}</Link>
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold">{copy("Chapter 1 content preview", "Preview ng nilalaman ng Kabanata 1")}</h1>
      <p>{copy("Read-only admin preview. Answers, progress and learning notes are not saved.",
        "Read-only na preview para sa admin. Walang sagot, progreso o tala na mase-save.")}</p>
    </header>
    <nav className="flex flex-wrap gap-2" aria-label={copy("Preview sections", "Mga bahagi ng preview")}>
      {tabs.map(tab => <Link key={tab.key} href={`${base}?phase=${tab.key}`}
        aria-current={section === tab.key ? "page" : undefined}
        className={`rounded-md border px-3 py-2 ${section === tab.key ? "border-primary bg-primary/10 font-semibold" : "border-ink/20"}`}>
        {lang === "en" ? tab.en : tab.fil}</Link>)}
    </nav>
    {section === "overview" && <div className="space-y-6">
      {(["expectations", "overview", "recap"] as const).map((key, index) =>
        <section key={key} className="space-y-3 rounded-xl border border-ink/15 p-5">
          <h2 className="text-lg font-semibold">{[
            copy("Before we begin", "Bago tayo magsimula"),
            copy("Chapter overview", "Buod ng kabanata"),
            copy("Before the post-test", "Bago ang post-test"),
          ][index]}</h2>
          <NotesMarkdown markdown={orientation[key][lang]} />
        </section>)}
      <p>{copy("The nine major-lesson introductions also appear at their matching lesson pages in this preview.",
        "Makikita rin ang siyam na panimula sa kani-kanilang pahina ng aralin sa preview na ito.")}</p>
    </div>}
    {form && <section className="space-y-5">
      <h2 className="text-xl font-semibold">{section === "pretest" ? "Pre-test" : "Post-test"} · {copy(`Section ${part} of 3`, `Bahagi ${part} sa 3`)}</h2>
      <p className="text-sm text-ink/70">{copy("Approved bilingual questions and choices. No answers or scoring are shown in the learner view.",
        "Aprubadong tanong at pagpipilian sa dalawang wika. Walang sagot o marka sa view ng mag-aaral.")}</p>
      <nav className="flex flex-wrap gap-2" aria-label={copy("Question sections", "Mga bahagi ng tanong")}>
        {[1, 2, 3].map(value => <Link key={value} href={`${base}?phase=${section}&part=${value}`}
          aria-current={part === value ? "page" : undefined} className="rounded-md border border-ink/20 px-3 py-2 underline">
          {copy(`Questions ${(value - 1) * 10 + 1}–${value * 10}`, `Tanong ${(value - 1) * 10 + 1}–${value * 10}`)}</Link>)}
      </nav>
      <ol start={(part - 1) * 10 + 1} className="space-y-4 list-decimal pl-6">{items.map(item =>
        <li key={item.item_id} className="rounded-xl border border-ink/15 p-4">
          <h3 className="font-medium">{item.stem[lang]}</h3>
          <ol className="mt-3 list-[upper-alpha] space-y-2 pl-5">{item.options.map(option =>
            <li key={option.id}>{option.label[lang]}</li>)}</ol>
          <p className="mt-2 text-sm text-ink/60">{copy("Also available: I don’t know yet · mark for review · save and resume.",
            "Mayroon din: Hindi ko pa alam · markahan para balikan · i-save at ipagpatuloy.")}</p>
        </li>)}</ol>
      {section === "posttest" && <p className="rounded-md border border-ink/15 p-4">{copy("After submission, the learner can reopen their post-test review with their selected answers, explanations and lesson links.",
        "Pagkatapos isumite, maaaring balikan ng mag-aaral ang post-test review kasama ang piniling sagot, paliwanag at mga link sa aralin.")}</p>}
    </section>}
    {section === "practice" && practice && <section className="space-y-5">
      <h2 className="text-xl font-semibold">{copy("Checkpoint practice", "Maikling pagsasanay")} · {group.key}</h2>
      <nav className="flex flex-wrap gap-2" aria-label={copy("Practice groups", "Mga pangkat ng pagsasanay")}>
        {checkpoints.map(row => <Link key={row.key} href={`${base}?phase=practice&group=${row.key}`}
          aria-current={row.key === group.key ? "page" : undefined} className="rounded-md border border-ink/20 px-3 py-2 underline">{row.key}</Link>)}
      </nav>
      <p>{lang === "en" ? group.reflection_prompt_en : group.reflection_prompt_fil}</p>
      {(["first", "alternates"] as const).map(kind => <div key={kind} className="space-y-3">
        <h3 className="font-semibold">{kind === "first" ? copy("First practice", "Unang pagsasanay") : copy("Alternate practice", "Ibang pagsasanay")}</h3>
        <ol className="list-decimal space-y-3 pl-6">{practice[kind].map(item => <li key={item.item_id} className="rounded-xl border border-ink/15 p-4">
          <p className="font-medium">{item.stem[lang]}</p>
          <ol className="mt-2 list-[upper-alpha] space-y-1 pl-5">{item.options.map(option => <li key={option.id}>{option.label[lang]}</li>)}</ol>
        </li>)}</ol>
      </div>)}
      <p>{copy("Practice is optional and ungraded. A learner can retry with alternate questions and read feedback after answering.",
        "Opsyonal at walang marka ang pagsasanay. Maaaring subukan muli ang ibang tanong at basahin ang paliwanag pagkatapos sumagot.")}</p>
    </section>}
    {section === "notes" && <Chapter1LearningNotes courseId={id} chapterHref={chapterHref} locale={locale}
      initial={{ drafts: [], shared: [], reviewer: null }} initialScope="chapter" readOnly />}
  </main>;
}

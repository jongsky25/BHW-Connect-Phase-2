import Link from "next/link";
import { ActivityLibrary } from "./activity-library";
import type { FacilitatorActivity } from "@/lib/elearning/activities";
import type { ReactNode } from "react";
import { NotesMarkdown } from "@/components/elearning/notes-markdown";
import {
  FacilitatorRoster,
  type RosterIndicator,
  type RosterRow,
} from "@/components/elearning/facilitator-roster";
import { parseFacilitatorNotes, type CompetencyObservation, type TestItemStat } from "@/lib/elearning/facilitator-guide";
import type { CourseModuleFacilitatorNotes, CourseSessionDelivery, ObservationIndicator } from "@/lib/elearning/types";

// Facilitator guide for the manual's subchapter and lesson pages. Server
// components only; rendered only for assessor/admin viewers, from notes RLS
// already withholds from BHWs. Never pass these props to learner components.

type Lang = "fil" | "en";
const pick = (lang: Lang, fil: string, en: string) => (lang === "en" ? en : fil);

function Section({ id, title, open = false, children }: { id: string; title: string; open?: boolean; children: ReactNode }) {
  return (
    <details id={id} open={open} className="group rounded-xl border border-ink/15 p-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 font-semibold">
        <span>{title}</span>
        <span aria-hidden className="text-ink/50 transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </details>
  );
}

export function IndicatorCard({ indicator, objective, lang, index }: { indicator: ObservationIndicator; objective?: string; lang: Lang; index: number }) {
  const levels: Array<[string, string, string]> = [
    [pick(lang, "Kaya na", "Kaya na (can do)"), pick(lang, indicator.levels.kaya_na_fil, indicator.levels.kaya_na_en), "bg-success/10"],
    [pick(lang, "Kailangan pa ng practice", "Needs practice"), pick(lang, indicator.levels.kailangan_practice_fil, indicator.levels.kailangan_practice_en), "bg-celebration/40"],
    [pick(lang, "Hindi pa", "Not yet"), pick(lang, indicator.levels.hindi_pa_fil, indicator.levels.hindi_pa_en), "bg-danger/10"],
  ];
  return (
    <li className="rounded-md border border-ink/10 p-4">
      <p className="text-sm text-ink/60">{pick(lang, `Indicator ${index + 1}`, `Indicator ${index + 1}`)}{objective ? ` · ${objective}` : ""}</p>
      <p className="mt-2 font-medium text-success">{pick(lang, "Nakikita — kaya na: ", "What you see when they can: ")}{pick(lang, indicator.observable_fil, indicator.observable_en)}</p>
      <p className="mt-1 font-medium text-danger">{pick(lang, "Hindi pa sapat: ", "Not yet: ")}{pick(lang, indicator.not_yet_fil, indicator.not_yet_en)}</p>
      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {levels.map(([label, text, tone]) => (
          <div key={label} className={`rounded-md p-2 ${tone}`}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/70">{label}</dt>
            <dd className="mt-1 text-sm text-ink/85">{text}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

export type GuideLesson = {
  id: string;
  href: string;
  title: string;
  objectives: string[];
  takeaways: string[];
};

export function SubchapterFacilitatorGuide({
  lang,
  lessons,
  objectives,
  notes,
  roster,
  observations,
  moduleId,
  rosterTruncated,
  deliveries = [],
}: {
  lang: Lang;
  lessons: GuideLesson[];
  objectives: string[];
  notes: CourseModuleFacilitatorNotes | null;
  roster: RosterRow[];
  observations: CompetencyObservation[];
  moduleId: string;
  rosterTruncated: boolean;
  deliveries?: CourseSessionDelivery[];
}) {
  const indicators = notes?.observation_indicators ?? [];
  const rosterIndicators: RosterIndicator[] = indicators.map((i) => ({
    objective_index: i.objective_index,
    observable: pick(lang, i.observable_fil, i.observable_en),
    levels: {
      kaya_na: pick(lang, i.levels.kaya_na_fil, i.levels.kaya_na_en),
      kailangan_practice: pick(lang, i.levels.kailangan_practice_fil, i.levels.kailangan_practice_en),
      hindi_pa: pick(lang, i.levels.hindi_pa_fil, i.levels.hindi_pa_en),
    },
  }));
  const script = notes ? pick(lang, notes.notes_fil, notes.notes_en) : "";
  const statement = notes ? pick(lang, notes.competency_statement_fil, notes.competency_statement_en) : "";

  return (
    <section aria-labelledby="facilitator-guide" className="flex flex-col gap-4">
      <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-5">
        <h2 id="facilitator-guide" className="text-xl font-semibold">{pick(lang, "Gabay ng facilitator", "Facilitator guide")}</h2>
        <p className="mt-1 text-sm text-ink/70">
          {pick(lang,
            "Para lamang sa facilitator at admin. Hindi ito nakikita ng BHW.",
            "For facilitators and admins only. BHWs never see this.")}
        </p>
        <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={pick(lang, "Mga bahagi ng gabay", "Guide sections")}>
          <a className="underline" href="#guide-learning">{pick(lang, "Ano ang natututuhan", "What BHWs learn")}</a>
          <a className="underline" href="#guide-competency">{pick(lang, "Kakayahang hahanapin", "Competency")}</a>
          <a className="underline" href="#guide-run">{pick(lang, "Paano patakbuhin", "How to run it")}</a>
          <a className="underline" href="#guide-bhws">{pick(lang, "Mga BHW", "BHWs")}</a>
        </nav>
      </div>

      <Section id="guide-learning" title={pick(lang, "1. Ano ang natututuhan ng BHW dito", "1. What the BHW is learning here")} open>
        {objectives.length > 0 && (
          <div>
            <p className="font-medium">{pick(lang, "Mga layunin ng subchapter", "Subchapter objectives")}</p>
            <ul className="mt-1 list-disc pl-5 text-ink/85">{objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
          </div>
        )}
        <ol className="flex flex-col gap-3">
          {lessons.map((l, i) => (
            <li key={l.id} className="rounded-md border border-ink/10 p-4">
              <Link className="font-semibold underline" href={l.href}>{i + 1}. {l.title}</Link>
              {l.objectives.length > 0 && (
                <p className="mt-1 text-sm text-ink/70">{pick(lang, "Layunin: ", "Objective: ")}{l.objectives.join(" · ")}</p>
              )}
              {l.takeaways.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm text-ink/85">{l.takeaways.map((t, j) => <li key={j}>{t}</li>)}</ul>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section id="guide-competency" title={pick(lang, "2. Kakayahang hahanapin sa BHW", "2. Competency to look for")}>
        {statement && (
          <p className="rounded-md border border-secondary/30 bg-secondary/5 p-3">
            <span className="text-sm font-semibold uppercase tracking-wide text-secondary">{pick(lang, "Pahayag ng kakayahan", "Competency statement")}</span>
            <br />{statement}
          </p>
        )}
        {indicators.length ? (
          <ul className="flex flex-col gap-3">
            {indicators.map((ind, i) => <IndicatorCard key={i} index={i} indicator={ind} lang={lang} objective={objectives[ind.objective_index]} />)}
          </ul>
        ) : (
          <p className="text-sm text-ink/60">{pick(lang, "Wala pang indicator para sa subchapter na ito.", "No indicators authored for this subchapter yet.")}</p>
        )}
      </Section>

      <ActivityLibrary activities={notes?.activities ?? []} lang={lang}/>
      <Section id="guide-run" title={pick(lang, "3. Paano patakbuhin ang subchapter", "3. How to run this subchapter")}>
        {script ? <NotesMarkdown markdown={script} /> : <p className="text-sm text-ink/60">{pick(lang, "Wala pang tala ng facilitator.", "No facilitator notes authored yet.")}</p>}
        <p className="text-sm text-ink/70">{pick(lang, "May sariling hakbang-hakbang na gabay ang bawat aralin — buksan ang aralin sa itaas.", "Each lesson has its own step-by-step guide — open a lesson above.")}</p>
        <div>
          <p className="font-medium">{pick(lang, "Mga huling pagtuturo nito sa iyong lugar", "Recent runs in your area")}</p>
          {deliveries.length ? (
            <ul className="mt-2 flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10 text-sm">
              {deliveries.map((d) => (
                <li key={d.id} className="flex flex-col gap-1 p-3">
                  <span className="font-medium">
                    {new Date(d.recorded_at).toLocaleDateString(lang === "en" ? "en-PH" : "fil-PH")} · {pick(lang, `${d.duration_minutes} minuto`, `${d.duration_minutes} min`)}
                  </span>
                  {d.notes && <span className="whitespace-pre-wrap text-ink/80">{d.notes}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-ink/60">{pick(lang, "Wala pang naitalang pagtuturo ng subchapter na ito. Itala ito sa iyong training session.", "No logged runs of this subchapter yet. Log them from your training session.")}</p>
          )}
        </div>
      </Section>

      <Section id="guide-bhws" title={pick(lang, "4. Mga BHW sa iyong lugar", "4. BHWs in your area")} open>
        <FacilitatorRoster lang={lang} moduleId={moduleId} rows={roster} indicators={rosterIndicators} observations={observations} lessonCount={lessons.length} activities={notes?.activities ?? []} />
        {rosterTruncated && <p className="text-sm text-ink/70">{pick(lang, "Unang 500 BHW lamang ang ipinapakita.", "Showing the first 500 BHWs only.")}</p>}
      </Section>
    </section>
  );
}

export function LessonFacilitatorGuide({
  lang,
  notesMarkdown,
  activities = [],
  indicators,
  objectives,
}: {
  lang: Lang;
  notesMarkdown: string | null;
  activities?: FacilitatorActivity[];
  indicators: ObservationIndicator[];
  objectives: string[];
}) {
  const sections = notesMarkdown ? parseFacilitatorNotes(notesMarkdown) : [];
  return (
    <section aria-labelledby="lesson-guide" className="flex flex-col gap-4">
      <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-5">
        <h2 id="lesson-guide" className="text-xl font-semibold">{pick(lang, "Gabay ng facilitator sa araling ito", "Facilitator guide for this lesson")}</h2>
        <p className="mt-1 text-sm text-ink/70">{pick(lang, "Para lamang sa facilitator at admin. Hindi ito nakikita ng BHW.", "For facilitators and admins only. BHWs never see this.")}</p>
        {objectives.length > 0 && (
          <ul className="mt-3 list-disc pl-5">{objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
        )}
      </div>
      <ActivityLibrary activities={activities} lang={lang}/>
      {sections.length ? (
        sections.map((s, i) => (
          <Section key={s.id} id={`lesson-guide-${s.id}`} title={s.heading || pick(lang, "Tala", "Notes")} open={i < 2 || s.id === "steps"}>
            <NotesMarkdown markdown={s.body} />
            {s.id === "observe" && indicators.length > 0 && (
              <ul className="flex flex-col gap-3">
                {indicators.map((ind, j) => <IndicatorCard key={j} index={j} indicator={ind} lang={lang} objective={objectives[ind.objective_index]} />)}
              </ul>
            )}
          </Section>
        ))
      ) : (
        <p className="text-sm text-ink/60">{pick(lang, "Wala pang gabay para sa araling ito.", "No guide authored for this lesson yet.")}</p>
      )}
      {!sections.some((s) => s.id === "observe") && indicators.length > 0 && (
        <Section id="lesson-guide-observe" title={pick(lang, "Ano ang oobserbahan", "What to observe")} open>
          <ul className="flex flex-col gap-3">
            {indicators.map((ind, j) => <IndicatorCard key={j} index={j} indicator={ind} lang={lang} objective={objectives[ind.objective_index]} />)}
          </ul>
        </Section>
      )}
    </section>
  );
}

export function ChapterTestInsights({ lang, items, bhwCount }: { lang: Lang; items: TestItemStat[]; bhwCount: number }) {
  const pct = (p: number | null) => (p === null ? "—" : `${p}%`);
  return (
    <section aria-labelledby="test-insights" className="flex flex-col gap-3 rounded-xl border border-secondary/30 bg-secondary/5 p-5">
      <h2 id="test-insights" className="text-lg font-semibold">{pick(lang, "Saan nahihirapan ang mga BHW sa iyong lugar", "Where BHWs in your area struggle")}</h2>
      <p className="text-sm text-ink/70">
        {pick(lang,
          `Pretest at posttest ng kabanatang ito, mula sa pinakahuling sagot ng ${bhwCount} BHW. Nasa itaas ang pinakamahirap na tanong — unahin ito sa pagbabalik-aral.`,
          `This chapter's pretest and posttest, from the latest answers of ${bhwCount} BHWs. The hardest questions are first — review these first.`)}
      </p>
      {items.length === 0 || bhwCount === 0 ? (
        <p className="text-sm text-ink/60">{pick(lang, "Wala pang sumasagot sa pretest o posttest.", "No pretest or posttest answers yet.")}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map(({ question, pretest, posttest, commonWrongOption }) => {
            const wrong = commonWrongOption === null ? null : question.options[commonWrongOption];
            return (
              <li key={question.id} className="rounded-md border border-ink/10 bg-canvas p-3 text-sm">
                <p className="font-medium">{pick(lang, question.prompt_fil, question.prompt_en)}</p>
                <p className="mt-1 text-ink/80">
                  {pick(lang, "Pretest", "Pretest")}: {pct(pretest.percent)} {pick(lang, "tama", "correct")} ({pretest.correct}/{pretest.answered})
                  {" · "}{pick(lang, "Posttest", "Posttest")}: {pct(posttest.percent)} {pick(lang, "tama", "correct")} ({posttest.correct}/{posttest.answered})
                </p>
                {wrong && (
                  <p className="mt-1 text-ink/70">
                    {pick(lang, "Karaniwang maling sagot: ", "Most common wrong answer: ")}<span className="italic">{pick(lang, wrong.fil, wrong.en)}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

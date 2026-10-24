"use client";

import { useState } from "react";
import { contentClarifications, clarificationVersion } from "@/lib/elearning/content-clarifications";

export function ContentClarificationLibrary({ initialLanguage, feedbackAvailable }: { initialLanguage: "en" | "fil"; feedbackAvailable: boolean }) {
  const [language, setLanguage] = useState(initialLanguage);
  const text = (en: string, fil: string) => language === "en" ? en : fil;
  const button = "min-h-[44px] rounded-md border border-ink/25 px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  return <div lang={language} className="space-y-6">
    <header className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full border border-secondary/40 bg-canvas px-3 py-1 text-sm font-semibold">{text("Pilot · open for feedback", "Pilot · bukas sa mga puna")}</span>
        <div role="group" aria-label={text("Explanation language", "Wika ng paliwanag")} className="flex gap-2">
          <button type="button" className={button} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button>
          <button type="button" className={button} aria-pressed={language === "fil"} onClick={() => setLanguage("fil")}>Filipino</button>
        </div>
      </div>
      <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">{text("Content clarifications", "Mga paglilinaw sa aralin")}</h1>
      <p className="mt-3">{text("Explore four explanations shaped by pilot feedback. Try the fictional practice cases, compare the possible responses, and comment on anything that remains unclear.", "Tingnan ang apat na paliwanag mula sa mga puna sa pilot. Subukan ang mga kathang practice case, ihambing ang maaaring tugon, at magkomento sa hindi pa malinaw.")}</p>
      <p className="mt-2 text-sm text-ink/70">{text("These are unscored learning examples.", "Mga halimbawa sa pag-aaral ito na walang marka.")} · {clarificationVersion}</p>
    </header>
    <nav aria-label={text("Clarification topics", "Mga paksa ng paglilinaw")} className="grid gap-2 sm:grid-cols-2">
      {contentClarifications.map(topic => <a key={topic.id} href={`#${topic.id}`} className={`${button} flex items-center`}>{topic.title[language]}</a>)}
    </nav>
    {contentClarifications.map(topic => <article id={topic.id} key={topic.id} aria-labelledby={`${topic.id}-title`} className="scroll-mt-24 space-y-4 rounded-xl border border-ink/20 bg-canvas p-5 sm:p-7">
      <h2 id={`${topic.id}-title`} className="text-xl font-semibold">{topic.title[language]}</h2>
      <p>{topic.explanation[language]}</p>
      <ul className="list-disc space-y-3 pl-5">{topic.points.map((point, index) => <li key={index}>{point[language]}</li>)}</ul>
      <section aria-labelledby={`${topic.id}-practice`} className="rounded-lg bg-ink/5 p-4">
        <h3 id={`${topic.id}-practice`} className="font-semibold">{text("Try a practice case", "Subukan ang practice case")}</h3>
        <p className="mt-2">{topic.practice[language]}</p>
        <details className="mt-3">
          <summary className="min-h-[44px] cursor-pointer py-2 font-medium">{text("Show a possible response", "Ipakita ang maaaring tugon")}</summary>
          <p className="mt-2">{topic.response[language]}</p>
        </details>
      </section>
      <a href={topic.source.href} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center text-sm underline">{topic.source.label}</a>
    </article>)}
    <section id="clarification-feedback" className="rounded-xl border border-secondary/30 bg-secondary/5 p-5">
      <h2 className="text-lg font-semibold">{text("Is the distinction clear now?", "Malinaw na ba ang pagkakaiba?")}</h2>
      <p className="mt-2">{feedbackAvailable
        ? text("Use the page comment button at the bottom right, then select the sentence or practice case. Tell us which wording or translation still needs work. If you are commenting on a test question, include its exact wording and language, without personal details.", "Gamitin ang button para sa komento sa kanang ibaba, saka piliin ang pangungusap o practice case. Sabihin kung anong salita o salin ang hindi pa malinaw. Kung tanong sa pagsusulit ang tinutukoy, isama ang eksaktong tanong at wika, nang walang personal na detalye.")
        : text("Review these explanations with your training team. Page comments are available to accounts with the feedback feature enabled.", "Suriin ang mga paliwanag kasama ang training team. Maaaring magkomento sa pahina ang mga account na may feedback feature.")}</p>
    </section>
  </div>;
}

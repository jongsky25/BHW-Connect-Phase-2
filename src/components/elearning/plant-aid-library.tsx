"use client";

import { useState } from "react";
import { plantAids, plantAidOwner, plantAidSource, plantAidVersion } from "@/lib/elearning/plant-aids";

export function PlantAidLibrary({ initialLanguage, feedbackAvailable }: { initialLanguage: "en" | "fil"; feedbackAvailable: boolean }) {
  const [language, setLanguage] = useState(initialLanguage);
  const [query, setQuery] = useState("");
  const text = (en: string, fil: string) => language === "en" ? en : fil;
  const filter = query.trim().toLocaleLowerCase();
  const cards = plantAids.filter(card => `${card.name} ${card.botanicalName} ${card.part.en} ${card.part.fil}`.toLocaleLowerCase().includes(filter));
  const button = "min-h-[44px] rounded-md border border-ink/25 px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

  return <div data-plant-aids lang={language} className="space-y-6">
    <header className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full border border-secondary/40 bg-canvas px-3 py-1 text-sm font-semibold">{text("Pilot · open for feedback", "Pilot · bukas sa mga puna")}</span>
        <div role="group" aria-label={text("Card language", "Wika ng card")} className="flex gap-2 print:hidden">
          <button type="button" className={button} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button>
          <button type="button" className={button} aria-pressed={language === "fil"} onClick={() => setLanguage("fil")}>Filipino</button>
        </div>
      </div>
      <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">{text("Plant reference aids", "Mga reference aid sa halaman")}</h1>
      <p className="mt-3 max-w-3xl">{text("Explore the sample cards, try the practice case, and tell us what to improve. These are pilot learning aids, not a way to confirm a real plant's identity or decide treatment.", "Tingnan ang mga sample card, subukan ang practice case, at sabihin kung ano ang dapat pagbutihin. Mga pilot learning aid ito; hindi nito kinukumpirma ang tunay na halaman o itinatakda ang lunas.")}</p>
      <p className="mt-3 text-sm">{text("Training owner", "Training owner")}: <strong>{plantAidOwner}</strong> · {plantAidVersion}</p>
    </header>

    <section aria-labelledby="plant-practice-heading" className="rounded-xl border border-ink/15 p-5">
      <h2 id="plant-practice-heading" className="text-lg font-semibold">{text("Try it: two plants, one familiar name", "Subukan: dalawang halaman, isang pamilyar na pangalan")}</h2>
      <p className="mt-2">{text('In this fictional case, a resident calls two different yard plants “tsaang-gubat” and asks which one to use. Open the Tsaang-gubat card. What is known, and what still needs checking?', 'Sa kathang kasong ito, “tsaang-gubat” ang tawag ng residente sa dalawang magkaibang halaman sa bakuran. Alin ang gagamitin? Buksan ang Tsaang-gubat card. Ano ang alam na at ano ang kailangan pang suriin?')}</p>
      <details className="mt-3 rounded-md bg-ink/5 p-3">
        <summary className="min-h-[44px] cursor-pointer py-2 font-medium">{text("Show a possible response", "Ipakita ang maaaring tugon")}</summary>
        <p className="mt-2">{text("The card lists Carmona retusa and leaves. That does not establish which yard plant matches it. If identity is uncertain, do not recommend preparation or use. Ask a health-center clinician or supervisor for help; urgent care must not wait for a card check.", "Nakalista sa card ang Carmona retusa at dahon. Hindi pa nito natitiyak kung alin sa mga halaman ang katugma. Kung hindi tiyak ang identity, huwag magrekomenda ng paghahanda o paggamit. Humingi ng tulong sa clinician o supervisor sa health center; huwag ipagpaliban ang agarang pangangalaga dahil sa card check.")}</p>
      </details>
      <p className="mt-3 text-sm text-ink/70">{text("Local contact details are still to be confirmed for this pilot.", "Kukumpirmahin pa ang lokal na contact para sa pilot na ito.")}</p>
    </section>

    <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
      <label className="grid w-full gap-1 sm:max-w-md">
        <span className="font-medium">{text("Find a plant or botanical name", "Hanapin ang halaman o botanical name")}</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} className="min-h-[44px] rounded-md border border-ink/25 bg-canvas px-3 py-2" />
      </label>
      <button type="button" className={button} onClick={() => window.print()}>{text("Print these cards", "I-print ang mga card")}</button>
    </div>
    <p role="status" className="text-sm text-ink/70 print:hidden">{text(`${cards.length} of ${plantAids.length} cards shown. Printing uses this selection.`, `${cards.length} sa ${plantAids.length} card ang ipinapakita. Ito ang mga card na ipi-print.`)}</p>

    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map(card => <article id={`plant-aid-${card.key}`} key={card.key} aria-labelledby={`plant-title-${card.key}`} className="break-inside-avoid rounded-xl border border-ink/20 bg-canvas p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">{text("Pilot reference card", "Pilot reference card")} · {plantAidVersion}</p>
        <h2 id={`plant-title-${card.key}`} className="mt-2 text-xl font-semibold">{card.name}</h2>
        <p className="mt-1 text-lg italic">{card.botanicalName}</p>
        <dl className="mt-4">
          <dt className="text-sm font-semibold">{text("Part listed in the lesson", "Bahaging nakalista sa aralin")}</dt>
          <dd className="mt-1">{card.part[language]}</dd>
        </dl>
        <p className="mt-4 text-sm">{text("Check the botanical name, the plant part, and what is still uncertain. A familiar name or picture alone does not establish identity.", "Suriin ang botanical name, bahagi ng halaman at kung ano ang hindi pa tiyak. Hindi sapat ang pamilyar na pangalan o larawan para matiyak ang identity.")}</p>
        <a className="mt-4 inline-flex min-h-[44px] items-center text-sm font-medium underline" href={`${plantAidSource}#${card.key}`} target="_blank" rel="noreferrer">{`PITAHC: ${card.name}`}</a>
        <p className="text-xs text-ink/60">{text("Names: PITAHC herb directory. Plant parts: Chapter 2 lesson. Clinical verification pending.", "Mga pangalan: PITAHC herb directory. Bahagi: aralin sa Chapter 2. Nakabinbin pa ang clinical verification.")}</p>
      </article>)}
    </div>
    {cards.length === 0 ? <p className="rounded-lg border border-ink/15 p-5">{text("No matching card. Try a local or botanical name.", "Walang tumugmang card. Subukan ang lokal o botanical name.")}</p> : null}

    <section id="plant-aid-feedback" className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 print:hidden">
      <h2 className="text-lg font-semibold">{text("What should we improve?", "Ano ang dapat pagbutihin?")}</h2>
      <p className="mt-2">{feedbackAvailable ? text("Use the page comment button at the bottom right, then select a card or sentence. Tell us whether the wording, translation, source links or print layout needs work. You can also suggest what a useful plant image should show.", "Gamitin ang button para sa komento sa kanang ibaba, saka piliin ang card o pangungusap. Sabihin kung ano ang dapat ayusin sa salita, salin, source link o print layout. Maaari ring magmungkahi kung ano ang dapat ipakita ng larawan ng halaman.") : text("Review the wording, translations, source links and print layout with training owner Ray Justin Ventura. Page comments are available to accounts with the feedback feature enabled.", "Suriin ang salita, salin, source link at print layout kasama ang training owner na si Ray Justin Ventura. Maaaring magkomento sa pahina ang mga account na may feedback feature.")}</p>
      <p className="mt-2 text-sm">{text("Please use fictional examples and omit patient details.", "Gumamit ng kathang halimbawa at huwag isama ang detalye ng pasyente.")}</p>
    </section>
    <style>{`@media print {
      body:has([data-plant-aids]) > header,
      body:has([data-plant-aids]) > footer,
      body:has([data-plant-aids]) [data-spot-feedback-ui] { display: none !important; }
      [data-plant-aids] { color: #111; }
      [data-plant-aids] article { break-inside: avoid; border-color: #555; }
    }`}</style>
  </div>;
}

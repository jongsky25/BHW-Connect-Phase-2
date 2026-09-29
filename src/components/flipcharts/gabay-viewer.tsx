"use client";

import { useState } from "react";
import { gabaySources, type GabayChart } from "@/lib/flipcharts/gabay-charts";

export function GabayViewer({ chart, initialLocale }: { chart: GabayChart; initialLocale: string }) {
  const [language, setLanguage] = useState<"fil" | "en">(initialLocale === "en" ? "en" : "fil");
  const [view, setView] = useState<"patient" | "bhw">("patient");
  const [index, setIndex] = useState(0);
  const [offline, setOffline] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const item = chart.pages[index];
  const isFil = language === "fil";

  async function prepareForVisit() {
    setOffline("saving");
    try {
      if (!("serviceWorker" in navigator) || !("caches" in window)) throw new Error("Offline storage unavailable");
      await navigator.serviceWorker.ready;
      const cache = await caches.open("bhw-connect-v1");
      // A successful addAll means every chart illustration and this route was stored.
      // The worker already caches visited Next.js chunks and clears this cache on sign out.
      await cache.addAll([window.location.href, ...chart.pages.map((page) => page.image)]);
      setOffline("saved");
    } catch {
      setOffline("error");
    }
  }

  return <div className="space-y-5">
    {chart.review === "draft" && <p className="rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-ink" role="status">
      {isFil ? "Draft para sa pagsusuri ng admin. Hindi pa ito nakikita ng BHW." : "Admin review draft. BHWs cannot see this yet."}
    </p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2" role="group" aria-label={isFil ? "Wika" : "Language"}>
        <button type="button" lang="fil" aria-pressed={isFil} onClick={() => setLanguage("fil")}
          className={`rounded-full border px-4 py-2 text-sm font-medium ${isFil ? "border-primary-text text-primary-text" : "border-ink/20 text-ink/70"}`}>Filipino</button>
        <button type="button" lang="en" aria-pressed={!isFil} onClick={() => setLanguage("en")}
          className={`rounded-full border px-4 py-2 text-sm font-medium ${!isFil ? "border-primary-text text-primary-text" : "border-ink/20 text-ink/70"}`}>English</button>
      </div>
      <button type="button" disabled={offline === "saving"} onClick={prepareForVisit}
        className="rounded-md border border-primary-text px-4 py-2 text-sm font-medium text-primary-text disabled:opacity-50">
        {isFil ? "Ihanda para sa pagbisita" : "Prepare for visit"}
      </button>
    </div>
    <p className="text-sm text-ink/70" aria-live="polite">
      {offline === "saved" ? (isFil ? "Nai-save ang chart sa device para sa offline na pagbasa. Alisin sa pag-sign out." : "Chart saved on this device for offline reading. Cleared on sign out.") :
        offline === "error" ? (isFil ? "Hindi na-save. Subukang muli kapag may internet." : "Could not save. Try again when connected.") :
        (isFil ? "Ihanda habang may internet para magamit sa mahina o walang signal." : "Prepare while connected for visits with weak or no signal.")}
    </p>
    <div className="flex justify-center gap-2" role="group" aria-label={isFil ? "Tanaw" : "View"}>
      <button type="button" aria-pressed={view === "patient"} onClick={() => setView("patient")}
        className={`rounded-full border px-4 py-2 text-sm font-medium ${view === "patient" ? "border-primary-text text-primary-text" : "border-ink/20 text-ink/70"}`}>
        {isFil ? "Para sa residente" : "Patient cards"}</button>
      <button type="button" aria-pressed={view === "bhw"} onClick={() => setView("bhw")}
        className={`rounded-full border px-4 py-2 text-sm font-medium ${view === "bhw" ? "border-primary-text text-primary-text" : "border-ink/20 text-ink/70"}`}>
        {isFil ? "Tala para sa BHW" : "BHW notes"}</button>
    </div>
    {view === "patient" ? <section className="mx-auto max-w-xl rounded-2xl border border-ink/10 bg-white p-4 text-center shadow-sm" lang={language}>
      {/* eslint-disable-next-line @next/next/no-img-element -- original fixed SVG illustrations */}
      <img src={item.image} alt={item.alt[language]} className="mx-auto aspect-[4/3] w-full rounded-xl object-contain" />
      <p className="mt-4 text-xl font-semibold leading-relaxed text-ink sm:text-2xl">{item.caption[language]}</p>
    </section> : <section className="rounded-xl border border-ink/10 p-5" lang={language}>
      <h2 className="font-semibold text-ink">{isFil ? "Tala para sa BHW" : "BHW speaker notes"}</h2>
      <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink">{item.notes[language]}</p>
      <div className="mt-5 border-t border-ink/10 pt-4 text-sm text-ink/70">
        <p>{isFil ? "Mga batayang pahayag at sanggunian" : "Claims and sources"}: {item.claims.join(", ")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">{item.claims.flatMap((id) => (gabaySources[id] ?? []).map((source) => <li key={`${id}-${source.url}`}>
          <a className="text-primary-text underline" href={source.url} target="_blank" rel="noopener noreferrer">{id}: {source.label}</a>
        </li>))}</ul>
        <p className="mt-3">{isFil ? "Huling pagsusuri" : "Last content review"}: {chart.reviewedAt ?? (isFil ? "nakabinbin" : "pending")}</p>
        <p className="mt-1">{isFil ? "Kumpirmahin online ang kasalukuyang clinic, pasilidad, stock, at proseso." : "Verify current clinics, facilities, stock, and process online."}</p>
      </div>
    </section>}
    <nav className="flex items-center justify-between gap-2" aria-label={isFil ? "Mga pahina" : "Pages"}>
      <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)} className="rounded-md border border-ink/20 px-4 py-2 text-sm disabled:opacity-40">
        {isFil ? "Nakaraan" : "Previous"}</button>
      <span className="text-sm text-ink/70">{index + 1} / {chart.pages.length}</span>
      <button type="button" disabled={index === chart.pages.length - 1} onClick={() => setIndex(index + 1)} className="rounded-md border border-ink/20 px-4 py-2 text-sm disabled:opacity-40">
        {isFil ? "Susunod" : "Next"}</button>
    </nav>
  </div>;
}

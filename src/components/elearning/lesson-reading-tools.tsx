"use client";

import { useState, type ReactNode } from "react";
import styles from "./lesson-reading-tools.module.css";

/** Local presentation only: the reader child keeps its identity, answers and callbacks. */
export function LessonReadingTools({ locale, children }: { locale: string; children: ReactNode }) {
  const en = locale === "en";
  const [comfortable, setComfortable] = useState(true);
  const copy = (english: string, fil: string) => en ? english : fil;
  return <div className={`min-w-0 space-y-4 ${comfortable ? styles.comfortable : ""}`} data-reading-layout={comfortable ? "comfortable" : "standard"}>
    <aside aria-labelledby="lesson-reading-tools-heading" className="min-w-0 space-y-3 rounded-xl border border-ink/20 bg-canvas p-4">
      <details>
      <summary id="lesson-reading-tools-heading" className="min-h-11 cursor-pointer content-center text-lg font-semibold">{copy("Reading tools", "Mga tulong sa pagbasa")}</summary>
      <fieldset className="mt-3 space-y-2">
        <legend className="text-sm font-medium">{copy("Read layout on this page", "Ayos ng pagbasa sa pahinang ito")}</legend>
        <div className="flex flex-wrap gap-2">
          {[true, false].map(value => <button key={String(value)} type="button" aria-pressed={comfortable === value}
            onClick={() => setComfortable(value)}
            className={`min-h-11 rounded-md border px-3 py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${comfortable === value ? "border-primary bg-primary text-on-primary" : "border-ink/25 text-ink"}`}>
            {value ? copy("Comfortable", "Maluwag") : copy("Standard", "Karaniwan")}
          </button>)}
        </div>
        <p className="text-sm text-ink/80">{copy("Comfortable uses a narrower column and more paragraph space on regular Read pages. Illustrated pages and full screen use their own layout.", "Mas makitid ang kolum at mas maluwag ang pagitan ng mga talata sa karaniwang Basahin. May sariling ayos ang mga pahinang may ilustrasyon at ang buong screen.")}</p>
      </fieldset>
      <details className="mt-3 rounded-md border border-ink/15 px-3 py-1">
        <summary className="min-h-11 cursor-pointer content-center font-medium">{copy("How to use the lesson controls", "Paano gamitin ang mga kontrol ng aralin")}</summary>
        <dl className="space-y-3 pb-3 text-sm leading-relaxed">
          <div><dt className="font-semibold">{copy("Read / Slides", "Basahin / Slides")}</dt>
            <dd>{copy("Read shows the section text. Slides shows the lesson as presentation pages. You can switch using the labeled buttons below.", "Ipinapakita ng Basahin ang buong teksto. Ipinapakita ng Slides ang mga pahina ng presentasyon. Gamitin ang mga button sa ibaba upang magpalit.")}</dd></div>
          <div><dt className="font-semibold">{copy("Full screen / Close", "Buong screen / Isara")}</dt>
            <dd>{copy("Full screen opens the reader. Close returns to this page. Portrait and Landscape choose the reader orientation.", "Binubuksan ng Buong screen ang reader. Ibinabalik ka ng Isara sa pahinang ito. Piliin ang Patayo o Pahiga para sa oryentasyon.")}</dd></div>
          <div><dt className="font-semibold">{copy("Previous / Next", "Nakaraan / Susunod")}</dt>
            <dd>{copy("Move through the current lesson sections. Use Mark lesson complete at the end when it becomes available.", "Lumipat sa mga bahagi ng kasalukuyang aralin. Gamitin ang Markahang tapos ang aralin sa dulo kapag maaari na ito.")}</dd></div>
        </dl>
      </details>
      </details>
    </aside>
    {children}
  </div>;
}

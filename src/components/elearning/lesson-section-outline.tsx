"use client";

import { useRef } from "react";

type Section = {
  id: string;
  heading_en: string;
  heading_fil: string;
  check?: unknown;
};

/** Headings only: opening the outline never reveals an unanswered check. */
export function LessonSectionOutline({ items, currentId, en, language, onSelect }: {
  items: Section[];
  currentId: string;
  en: boolean;
  language?: string;
  onSelect: (id: string) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  if (items.length < 2) return null;
  const index = items.findIndex(item => item.id === currentId);
  if (index < 0) return null;
  const label = en ? "Sections in this lesson" : "Mga bahagi ng araling ito";
  return <details ref={details} lang={en ? "en" : "fil"} className="min-w-0 rounded-xl border border-ink/20 bg-canvas p-3">
    <summary className="min-h-11 cursor-pointer content-center wrap-anywhere font-semibold text-ink">
      {label} · {index + 1} / {items.length}
    </summary>
    <p className="mt-2 text-sm text-ink/80">{en
      ? "Choose a section to read or revisit. This shows your position, not lesson completion. Practice checks still need your response."
      : "Pumili ng bahaging babasahin o babalikan. Puwesto ito, hindi pagkumpleto ng aralin. Kailangan pa ring sagutin ang mga tanong sa pagsasanay."}</p>
    <nav aria-label={label} className="mt-3">
      <ol className="space-y-2">
        {items.map((item, i) => <li key={item.id}>
          <button type="button" aria-current={item.id === currentId ? "step" : undefined}
            className="flex min-h-11 w-full min-w-0 items-start gap-3 rounded-lg border border-ink/20 px-3 py-2 text-left text-ink aria-[current=step]:border-primary aria-[current=step]:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => {
              if (details.current) details.current.open = false;
              onSelect(item.id);
            }}>
            <span className="shrink-0 font-semibold" aria-hidden="true">{i + 1}.</span>
            <span className="min-w-0 wrap-anywhere">
              <span lang={language ?? (en ? "en" : "fil")} className="block">{en ? item.heading_en : item.heading_fil}</span>
              {item.check ? <span className="block text-sm font-medium text-ink/80">{en ? "Practice check" : "Tanong sa pagsasanay"}</span> : null}
              {item.id === currentId ? <span className="block text-sm font-medium">{en ? "Current section" : "Kasalukuyang bahagi"}</span> : null}
            </span>
          </button>
        </li>)}
      </ol>
    </nav>
  </details>;
}

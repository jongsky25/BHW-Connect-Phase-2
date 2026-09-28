"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { SearchResult } from "@/lib/search/content";

export function GlobalSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal, cache: "no-store",
        });
        if (!response.ok) throw new Error("search failed");
        const body = await response.json() as { results: SearchResult[] };
        if (!controller.signal.aborted) setResults(body.results.slice(0, 7));
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  function updateQuery(value: string) {
    setQuery(value);
    setResults([]);
    setLoading(false);
    setActive(-1);
    setFailed(false);
  }

  return <div className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={t("label")} aria-expanded={open}
      aria-controls="global-search-panel" className="rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5">
      <span aria-hidden="true">⌕ </span>{t("button")}
    </button>
    {open ? <div id="global-search-panel" className="fixed inset-x-3 top-20 z-50 rounded-xl border border-ink/20 bg-canvas p-3 shadow-xl sm:absolute sm:-left-64 sm:right-0 sm:top-full sm:mt-3 sm:w-96">
      <form action="/search" role="search" onSubmit={() => setOpen(false)}>
        <label htmlFor="global-search-query" className="sr-only">{t("label")}</label>
        <input ref={inputRef} id="global-search-query" name="q" type="search" autoComplete="off"
          role="combobox" aria-autocomplete="list" aria-expanded={true}
          maxLength={80} value={query} placeholder={t("placeholder")}
          onChange={(event) => updateQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setOpen(false); return; }
            if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, results.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, -1)); }
            if (event.key === "Enter" && active >= 0 && results[active]) {
              event.preventDefault();
              setOpen(false);
              router.push(results[active].href);
            }
          }}
          aria-controls="global-search-results" aria-activedescendant={active >= 0 ? `global-search-result-${active}` : undefined}
          className="w-full rounded-md border border-ink/20 bg-canvas px-3 py-2 text-ink" />
      </form>
      <div aria-live="polite" className="mt-2 max-h-80 overflow-y-auto">
        {query.trim().length < 2 ? <p className="px-2 py-2 text-sm text-ink/60">{t("hint")}</p> : null}
        {loading ? <p className="px-2 py-2 text-sm text-ink/60">{t("loading")}</p> : null}
        {failed ? <p className="px-2 py-2 text-sm text-ink/60">{t("error")}</p> : null}
        {!loading && !failed && query.trim().length >= 2 && results.length === 0 ? <p className="px-2 py-2 text-sm text-ink/60">{t("empty")}</p> : null}
        <ul id="global-search-results" role="listbox">{results.map((result, index) => <li key={result.id} id={`global-search-result-${index}`} role="option" aria-selected={index === active}>
          <Link prefetch={false} href={result.href} onClick={() => setOpen(false)}
            className={`block rounded-md px-2 py-2 hover:bg-ink/5 ${index === active ? "bg-ink/5" : ""}`}>
            <span className="block text-xs text-ink/60">{t(`kind.${result.kind}`)}</span>
            <span className="block text-sm font-medium text-ink">{result.title}</span>
          </Link>
        </li>)}</ul>
      </div>
      {query.trim().length >= 2 ? <Link prefetch={false} href={`/search?q=${encodeURIComponent(query.trim())}`}
        onClick={() => setOpen(false)} className="mt-2 block border-t border-ink/10 px-2 pt-3 text-sm font-medium text-primary-text hover:underline">
        {t("allResults")}
      </Link> : null}
    </div> : null}
  </div>;
}

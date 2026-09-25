"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { FlipChartPage } from "@/lib/flipcharts/types";

type Props = {
  pages: FlipChartPage[];
};

export function FlipchartViewer({ pages }: Props) {
  const t = useTranslations("flipcharts");
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<"client" | "bhw">("client");
  const page = pages[index];

  if (!page) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setView("client")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium ${view === "client" ? "border-primary-text text-primary-text" : "border-ink/20 text-ink/70"}`}
        >
          {t("clientViewToggle")}
        </button>
        <button
          type="button"
          onClick={() => setView("bhw")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium ${view === "bhw" ? "border-primary-text text-primary-text" : "border-ink/20 text-ink/70"}`}
        >
          {t("bhwViewToggle")}
        </button>
      </div>

      <div className="rounded-md border border-ink/10 p-4">
        {view === "client" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- designer-authored flip-chart content, no known dimensions to optimize for */}
            <img src={page.client_image_url} alt="" className="max-h-96 w-full rounded-md object-contain" />
            {page.client_caption_en ? <p className="text-lg font-medium text-ink">{page.client_caption_en}</p> : null}
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{t("scriptHeading")}</p>
            <p className="mt-2 whitespace-pre-wrap text-ink">{page.script_en}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="rounded-md border border-ink/20 px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
        >
          {t("previousPageAction")}
        </button>
        <p className="text-sm text-ink/70">{t("pageIndicator", { current: index + 1, total: pages.length })}</p>
        <button
          type="button"
          disabled={index === pages.length - 1}
          onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
          className="rounded-md border border-ink/20 px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
        >
          {t("nextPageAction")}
        </button>
      </div>
    </div>
  );
}

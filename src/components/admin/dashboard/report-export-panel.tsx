"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ACTIVITY_REPORT_COLUMNS } from "@/lib/reports/columns";
import type { ActivityReportColumnKey } from "@/lib/reports/types";

const ALL_SELECTED: Record<ActivityReportColumnKey, boolean> = Object.fromEntries(
  ACTIVITY_REPORT_COLUMNS.map((key) => [key, true]),
) as Record<ActivityReportColumnKey, boolean>;

function buttonClass(enabled: boolean): string {
  return enabled
    ? "rounded-md bg-primary px-4 py-2 text-sm font-medium text-canvas hover:opacity-90"
    : "cursor-not-allowed rounded-md bg-ink/20 px-4 py-2 text-sm font-medium text-ink/50";
}

export function ReportExportPanel() {
  const t = useTranslations("admin.dashboard.reports");
  const tColumns = useTranslations("admin.dashboard.reports.columns");
  const searchParams = useSearchParams();
  const range = searchParams.get("range") ?? "30";

  const [selected, setSelected] = useState(ALL_SELECTED);
  const selectedColumns = ACTIVITY_REPORT_COLUMNS.filter((key) => selected[key]);
  const hasSelection = selectedColumns.length > 0;

  function toggle(key: ActivityReportColumnKey) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function exportUrl(format: "csv" | "xlsx"): string {
    const params = new URLSearchParams({ format, range, columns: selectedColumns.join(",") });
    return `/api/admin/reports/export?${params.toString()}`;
  }

  const pdfUrl = `/api/admin/reports/summary-pdf?range=${range}`;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-ink/10 p-4">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{t("exportHeading")}</h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink/70">{t("columnPickerLabel")}</legend>
        <div className="flex flex-wrap gap-4">
          {ACTIVITY_REPORT_COLUMNS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={selected[key]} onChange={() => toggle(key)} className="h-4 w-4" />
              {tColumns(key)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => window.location.assign(exportUrl("csv"))}
          className={buttonClass(hasSelection)}
        >
          {t("exportCsv")}
        </button>
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => window.location.assign(exportUrl("xlsx"))}
          className={buttonClass(hasSelection)}
        >
          {t("exportExcel")}
        </button>
        <button
          type="button"
          onClick={() => window.location.assign(pdfUrl)}
          className="rounded-md border border-ink/20 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
        >
          {t("exportPdfSummary")}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { mapFlipchartRpcError } from "@/lib/flipcharts/error-messages";
import type { FlipChart } from "@/lib/flipcharts/types";
import { createClient } from "@/lib/supabase/client";
import { FlipchartForm } from "./flipchart-form";

type Props = {
  initialCharts: FlipChart[];
  authorUserId: string;
  authorFullName: string;
  authorUsername: string;
};

export function DesignerFlipchartConsole({ initialCharts, authorUserId, authorFullName, authorUsername }: Props) {
  const t = useTranslations("designer.flipcharts");
  const [charts, setCharts] = useState(initialCharts);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_flipchart_submit", { p_flip_chart_id: id });
      if (rpcError) {
        setError(t(mapFlipchartRpcError(rpcError.message)));
        return;
      }
      setCharts((prev) => prev.map((c) => (c.id === id ? { ...c, status: "in_review", review_note: null } : c)));
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_flipchart_delete", { p_flip_chart_id: id });
      if (rpcError) {
        setError(t(mapFlipchartRpcError(rpcError.message)));
        return;
      }
      setCharts((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <FlipchartForm
        namespace="designer.flipcharts"
        authorUserId={authorUserId}
        authorFullName={authorFullName}
        authorUsername={authorUsername}
        createdStatus="draft"
        onCreated={(chart) => setCharts((prev) => [chart, ...prev])}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">{t("myChartsHeading")}</h2>
        {charts.length === 0 ? (
          <EmptyState message={t("empty")} />
        ) : (
          <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
            {charts.map((chart) => (
              <li key={chart.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{chart.title_en}</p>
                    <p className="text-sm text-ink/70">{t(`status.${chart.status}`)}</p>
                  </div>
                  <div className="flex gap-2">
                    {chart.status === "draft" ? (
                      <button
                        type="button"
                        disabled={pendingId === chart.id}
                        onClick={() => handleSubmit(chart.id)}
                        className="rounded-md border border-secondary/40 px-2 py-1 text-xs font-medium text-secondary hover:bg-secondary/5 disabled:opacity-60"
                      >
                        {t("submitAction")}
                      </button>
                    ) : null}
                    {chart.status !== "published" ? (
                      <button
                        type="button"
                        disabled={pendingId === chart.id}
                        onClick={() => handleDelete(chart.id)}
                        className="rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
                      >
                        {t("deleteAction")}
                      </button>
                    ) : null}
                  </div>
                </div>
                {chart.review_note ? (
                  <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
                    {t("reviewNotePrefix")} {chart.review_note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

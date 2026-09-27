"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VisibilityActions, VisibilityBadge, VisibilityTabs } from "@/components/admin/content-visibility";
import { EmptyState } from "@/components/empty-state";
import { mapFlipchartRpcError } from "@/lib/flipcharts/error-messages";
import type { FlipChart, FlipChartPage } from "@/lib/flipcharts/types";
import { createClient } from "@/lib/supabase/client";
import { FlipchartForm } from "./flipchart-form";

type ChartWithPages = FlipChart & { flip_chart_pages: FlipChartPage[] };

type Props = {
  charts: ChartWithPages[];
  view: "active" | "archived";
  activeCount: number;
  archivedCount: number;
  authorUserId: string;
  authorFullName: string;
  authorUsername: string;
};

export function AdminFlipchartConsole({
  charts,
  view,
  activeCount,
  archivedCount,
  authorUserId,
  authorFullName,
  authorUsername,
}: Props) {
  const t = useTranslations("admin.flipcharts");
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReview(id: string, approve: boolean) {
    setError(null);
    setPendingId(id);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_flipchart_review", {
        p_flip_chart_id: id,
        p_approve: approve,
        p_note: approve ? null : (notes[id]?.trim() || null),
      });
      if (rpcError) {
        setError(t(mapFlipchartRpcError(rpcError.message)));
        return;
      }
      router.refresh();
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
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  const inReview = charts.filter((c) => c.status === "in_review");

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title={t("heading")} />

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <FlipchartForm
        namespace="admin.flipcharts"
        authorUserId={authorUserId}
        authorFullName={authorFullName}
        authorUsername={authorUsername}
        createdStatus="published"
        onCreated={() => router.refresh()}
      />

      <section className="flex flex-col gap-4" aria-label={t("reviewQueueHeading")}>
        <h2 className="text-lg font-semibold text-ink">{t("reviewQueueHeading")}</h2>
        {inReview.length === 0 ? (
          <EmptyState message={t("noReviewItems")} />
        ) : (
          <ul className="flex flex-col gap-4">
            {inReview.map((chart) => (
              <li key={chart.id} className="rounded-md border border-ink/10 p-4">
                <p className="font-medium text-ink">{chart.title_en}</p>
                <p className="text-sm text-ink/70">{chart.author_full_name}</p>

                <ol className="mt-3 flex flex-col gap-3">
                  {chart.flip_chart_pages
                    .sort((a, b) => a.position - b.position)
                    .map((page) => (
                      <li key={page.id} className="flex flex-col gap-2 rounded-md bg-ink/5 p-3 sm:flex-row">
                        {/* eslint-disable-next-line @next/next/no-img-element -- reviewer preview of designer-authored content */}
                        <img src={page.client_image_url} alt="" className="h-24 w-24 rounded-md object-cover" />
                        <div className="text-sm text-ink">
                          <p className="text-ink/70">{page.client_caption_en}</p>
                          <p className="mt-1 whitespace-pre-wrap">{page.script_en}</p>
                        </div>
                      </li>
                    ))}
                </ol>

                <div className="mt-3 flex flex-col gap-2">
                  <label htmlFor={`reject-note-${chart.id}`} className="text-sm font-medium text-ink">
                    {t("rejectNoteLabel")}
                  </label>
                  <textarea
                    id={`reject-note-${chart.id}`}
                    rows={2}
                    value={notes[chart.id] ?? ""}
                    onChange={(event) => setNotes((prev) => ({ ...prev, [chart.id]: event.target.value }))}
                    className="rounded-md border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pendingId === chart.id}
                      onClick={() => handleReview(chart.id, true)}
                      className="rounded-md border border-success/40 px-3 py-1.5 text-sm font-medium text-success hover:bg-success/5 disabled:opacity-60"
                    >
                      {t("approveAction")}
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === chart.id}
                      onClick={() => handleReview(chart.id, false)}
                      className="rounded-md border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
                    >
                      {t("rejectAction")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-label={t("allChartsHeading")}>
        <h2 className="text-lg font-semibold text-ink">{t("allChartsHeading")}</h2>

        <VisibilityTabs
          basePath="/admin/flipcharts"
          view={view}
          activeCount={activeCount}
          archivedCount={archivedCount}
        />

        {charts.length === 0 ? (
          <EmptyState message={t("empty")} />
        ) : (
          <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
            {charts.map((chart) => (
              <li key={chart.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{chart.title_en}</p>
                  <p className="text-sm text-ink/70">
                    {chart.author_full_name} · {t(`status.${chart.status}`)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {chart.status === "published" ? (
                    <>
                      <VisibilityBadge hidden_at={chart.hidden_at} archived_at={chart.archived_at} />
                      <VisibilityActions
                        contentType="flipchart"
                        id={chart.id}
                        hidden_at={chart.hidden_at}
                        archived_at={chart.archived_at}
                      />
                    </>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

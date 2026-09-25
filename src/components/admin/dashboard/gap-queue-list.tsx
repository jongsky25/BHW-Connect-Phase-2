"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { mapDashboardRpcError } from "@/lib/dashboard/error-messages";
import type { GapQueueRow } from "@/lib/dashboard/types";
import { createClient } from "@/lib/supabase/client";

// Maps the route's failure onto the message key that tells the admin what to
// do next. Exported so the mapping is testable on its own, following
// mapKbRpcError / mapDashboardRpcError — the house pattern for turning a
// backend failure into a localized string.
export function aiErrorKey(status: number, reason: string | undefined): string {
  if (status !== 503) return "aiDraftFailed";

  switch (reason) {
    case "no_api_key":
      return "aiNoKey";
    case "flag_disabled":
      return "aiFlagOff";
    case "over_ceiling":
      return "aiOverCeiling";
    case "timeout":
      return "aiTimeout";
    default:
      return "aiProviderError";
  }
}

export function GapQueueList({ rows, aiDraftEnabled = false }: { rows: GapQueueRow[]; aiDraftEnabled?: boolean }) {
  const t = useTranslations("admin.dashboard.chatGuide");
  const router = useRouter();
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The clearance step, inline. There is no modal primitive in this repo, so
  // this is a disclosure: one row open at a time, with the question in an
  // editable textarea. Editable is the point — what gets sent is what the
  // admin approved after redacting, which is what makes the payload
  // admin_cleared rather than user_generated.
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [clearedText, setClearedText] = useState("");
  const [draftingId, setDraftingId] = useState<string | null>(null);

  function openClearance(row: GapQueueRow) {
    setError(null);
    setClearingId(row.id);
    setClearedText(row.text);
  }

  async function handleDraft(id: string) {
    setError(null);
    setDraftingId(id);
    try {
      const response = await fetch("/api/admin/gap/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unmatched_question_id: id, cleared_text: clearedText }),
      });

      if (!response.ok) {
        // Every failure here is recoverable by hand: the manual "create entry
        // from this" link is still right there, and it is the baseline this
        // feature accelerates rather than replaces.
        //
        // The reason is surfaced rather than collapsed into one string. A 503
        // covers "no key configured", "daily ceiling reached" and "the
        // provider rejected the call", and those need three different actions
        // from whoever is reading the message — the first version of this said
        // only "external AI is unavailable", which sent the operator looking at
        // the API key when the real cause was a retired model.
        const body = (await response.json().catch(() => null)) as { reason?: string } | null;
        setError(t(aiErrorKey(response.status, body?.reason)));
        return;
      }

      const { entry_id: entryId } = (await response.json()) as { entry_id: string };
      router.push(`/admin/kb/entries/${entryId}`);
    } catch {
      setError(t("genericError"));
    } finally {
      setDraftingId(null);
    }
  }

  async function handleDismiss(id: string) {
    setError(null);
    setDismissingId(id);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_gap_dismiss", { p_id: id });

      if (rpcError) {
        setError(t(mapDashboardRpcError(rpcError.message)));
        return;
      }

      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setDismissingId(null);
    }
  }

  if (rows.length === 0) {
    return <EmptyState message={t("gapQueueEmpty")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-ink/10">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="bg-ink/5">
            <tr>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                {t("colQuestion")}
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                {t("colAskedCount")}
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                {t("colReason")}
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                {t("colActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink/10">
                <td className="px-3 py-3 text-sm text-ink">{row.text}</td>
                <td className="px-3 py-3 text-sm text-ink">{row.asked_count}</td>
                <td className="px-3 py-3 text-sm text-ink">
                  {t(row.reason === "bad_answer" ? "reasonBadAnswer" : "reasonNoAnswer")}
                </td>
                <td className="px-3 py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/kb/entries/new?fromUnmatched=${row.id}`}
                      className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-on-primary"
                    >
                      {t("createEntryAction")}
                    </Link>
                    {aiDraftEnabled ? (
                      <button
                        type="button"
                        onClick={() => (clearingId === row.id ? setClearingId(null) : openClearance(row))}
                        aria-expanded={clearingId === row.id}
                        className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5"
                      >
                        {t("aiDraftAction")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={dismissingId === row.id}
                      onClick={() => handleDismiss(row.id)}
                      className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
                    >
                      {dismissingId === row.id ? t("dismissing") : t("dismissAction")}
                    </button>
                  </div>

                  {clearingId === row.id ? (
                    <div className="mt-3 flex flex-col gap-2 rounded-md border border-ink/10 bg-ink/5 p-3">
                      <label
                        htmlFor={`gap-cleared-${row.id}`}
                        className="text-xs font-medium text-ink"
                      >
                        {t("clearanceLabel")}
                      </label>
                      <p className="text-xs text-ink/70">{t("clearanceHint")}</p>
                      <textarea
                        id={`gap-cleared-${row.id}`}
                        rows={3}
                        value={clearedText}
                        onChange={(event) => setClearedText(event.target.value)}
                        className="w-full rounded-md border border-ink/20 bg-canvas px-2 py-1 text-sm text-ink"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={draftingId === row.id || clearedText.trim().length === 0}
                          onClick={() => handleDraft(row.id)}
                          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-on-primary disabled:opacity-60"
                        >
                          {draftingId === row.id ? t("aiDrafting") : t("aiSendAction")}
                        </button>
                        <button
                          type="button"
                          disabled={draftingId === row.id}
                          onClick={() => setClearingId(null)}
                          className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink disabled:opacity-60"
                        >
                          {t("cancelAction")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

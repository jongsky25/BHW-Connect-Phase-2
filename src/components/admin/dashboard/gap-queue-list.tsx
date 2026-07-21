"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mapDashboardRpcError } from "@/lib/dashboard/error-messages";
import type { GapQueueRow } from "@/lib/dashboard/types";
import { createClient } from "@/lib/supabase/client";

export function GapQueueList({ rows }: { rows: GapQueueRow[] }) {
  const t = useTranslations("admin.dashboard.chatGuide");
  const router = useRouter();
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    return <p className="text-ink/70">{t("gapQueueEmpty")}</p>;
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
                      className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-canvas"
                    >
                      {t("createEntryAction")}
                    </Link>
                    <button
                      type="button"
                      disabled={dismissingId === row.id}
                      onClick={() => handleDismiss(row.id)}
                      className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
                    >
                      {dismissingId === row.id ? t("dismissing") : t("dismissAction")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

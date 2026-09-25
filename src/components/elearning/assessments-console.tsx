"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { mapElearningRpcError } from "@/lib/elearning/error-messages";
import type { Assessment } from "@/lib/elearning/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialQueue: Assessment[];
  initialMine: Assessment[];
};

export function AssessmentsConsole({ initialQueue, initialMine }: Props) {
  const t = useTranslations("assessments");
  const tCrumbs = useTranslations("breadcrumbs");
  const [queue, setQueue] = useState(initialQueue);
  const [mine, setMine] = useState(initialMine);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [issuedNotice, setIssuedNotice] = useState<string | null>(null);

  async function handleClaim(assessment: Assessment) {
    setError(null);
    setPendingId(assessment.id);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_assessment_claim", { p_assessment_id: assessment.id });

      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }

      setQueue((prev) => prev.filter((a) => a.id !== assessment.id));
      setMine((prev) => [...prev, { ...assessment, status: "assigned" }]);
    } finally {
      setPendingId(null);
    }
  }

  async function handleDecide(assessment: Assessment, passed: boolean) {
    setError(null);
    setIssuedNotice(null);
    setPendingId(assessment.id);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("rpc_assessment_decide", {
        p_assessment_id: assessment.id,
        p_passed: passed,
        p_notes: notesById[assessment.id] ?? "",
      });

      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }

      const row = (data as Array<{ certificate_id: string | null; verification_code: string | null }> | null)?.[0];
      if (passed && row?.verification_code) {
        setIssuedNotice(row.verification_code);
      }

      setMine((prev) => prev.filter((a) => a.id !== assessment.id));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: tCrumbs("home"), href: "/home" }, { label: t("heading") }]} />
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {issuedNotice ? (
        <p role="status" className="rounded-md bg-success/10 px-4 py-3 text-sm text-success">
          {issuedNotice}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">{t("queueHeading")}</h2>
        {queue.length === 0 ? (
          <EmptyState message={t("empty")} />
        ) : (
          <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
            {queue.map((assessment) => (
              <li key={assessment.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{assessment.users?.full_name}</p>
                  <p className="text-sm text-ink/70">{assessment.courses?.title_en}</p>
                </div>
                <button
                  type="button"
                  disabled={pendingId === assessment.id}
                  onClick={() => handleClaim(assessment)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
                >
                  {t("claimAction")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">{t("myQueueHeading")}</h2>
        {mine.length === 0 ? (
          <EmptyState message={t("emptyMine")} />
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.map((assessment) => (
              <li key={assessment.id} className="flex flex-col gap-2 rounded-md border border-ink/10 p-4">
                <p className="font-medium text-ink">{assessment.users?.full_name}</p>
                <p className="text-sm text-ink/70">{assessment.courses?.title_en}</p>
                <textarea
                  aria-label={t("notesLabel")}
                  placeholder={t("notesLabel")}
                  rows={2}
                  value={notesById[assessment.id] ?? ""}
                  onChange={(event) =>
                    setNotesById((prev) => ({ ...prev, [assessment.id]: event.target.value }))
                  }
                  className="rounded-md border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pendingId === assessment.id}
                    onClick={() => handleDecide(assessment, true)}
                    className="rounded-md border border-success/40 px-3 py-2 text-sm font-medium text-success hover:bg-success/5 disabled:opacity-60"
                  >
                    {t("passAction")}
                  </button>
                  <button
                    type="button"
                    disabled={pendingId === assessment.id}
                    onClick={() => handleDecide(assessment, false)}
                    className="rounded-md border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
                  >
                    {t("failAction")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

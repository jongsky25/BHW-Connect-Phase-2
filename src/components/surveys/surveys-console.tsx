"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VisibilityActions, VisibilityBadge, VisibilityTabs } from "@/components/admin/content-visibility";
import { EmptyState } from "@/components/empty-state";
import { mapSurveyRpcError } from "@/lib/surveys/error-messages";
import type { Survey, SurveyStatus } from "@/lib/surveys/types";
import { createClient } from "@/lib/supabase/client";
import { SurveyForm } from "./survey-form";
import type { OrgUnitNode } from "@/lib/org-units";

type Props = {
  surveys: Survey[];
  view: "active" | "archived";
  activeCount: number;
  archivedCount: number;
  rootOrgUnit: OrgUnitNode;
};

export function SurveysConsole({ surveys, view, activeCount, archivedCount, rootOrgUnit }: Props) {
  const t = useTranslations("admin.surveys");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSetStatus(id: string, status: SurveyStatus) {
    setError(null);
    setPendingId(id);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_survey_set_status", {
        p_survey_id: id,
        p_status: status,
      });

      if (rpcError) {
        setError(t(mapSurveyRpcError(rpcError.message)));
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
      const { error: rpcError } = await supabase.rpc("rpc_survey_delete", { p_survey_id: id });

      if (rpcError) {
        setError(t(mapSurveyRpcError(rpcError.message)));
        return;
      }

      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("heading")} />

      <SurveyForm rootOrgUnit={rootOrgUnit} onCreated={() => router.refresh()} />

      <VisibilityTabs
        basePath="/admin/surveys"
        view={view}
        activeCount={activeCount}
        archivedCount={archivedCount}
      />

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {surveys.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="overflow-x-auto rounded-md border border-ink/10">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="bg-ink/5">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colTitle")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colOrgUnit")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colStatus")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colVisibility")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((survey) => (
                <tr key={survey.id} className="border-b border-ink/10">
                  <td className="px-3 py-3 text-sm text-ink">{survey.title_en}</td>
                  <td className="px-3 py-3 text-sm text-ink">{survey.org_units?.name ?? "—"}</td>
                  <td className="px-3 py-3 text-sm text-ink">{t(`status.${survey.status}`)}</td>
                  <td className="px-3 py-3 text-sm">
                    <VisibilityBadge hidden_at={survey.hidden_at} archived_at={survey.archived_at} />
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/surveys/${survey.id}`}
                        className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5"
                      >
                        {t("viewResultsAction")}
                      </Link>
                      {survey.status !== "published" ? (
                        <button
                          type="button"
                          disabled={pendingId === survey.id}
                          onClick={() => handleSetStatus(survey.id, "published")}
                          className="rounded-md border border-success/40 px-2 py-1 text-xs font-medium text-success hover:bg-success/5 disabled:opacity-60"
                        >
                          {t("publishAction")}
                        </button>
                      ) : null}
                      {survey.status !== "closed" ? (
                        <button
                          type="button"
                          disabled={pendingId === survey.id}
                          onClick={() => handleSetStatus(survey.id, "closed")}
                          className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
                        >
                          {t("closeAction")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={pendingId === survey.id}
                        onClick={() => handleDelete(survey.id)}
                        className="rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
                      >
                        {t("deleteAction")}
                      </button>
                      <VisibilityActions
                        contentType="survey"
                        id={survey.id}
                        hidden_at={survey.hidden_at}
                        archived_at={survey.archived_at}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

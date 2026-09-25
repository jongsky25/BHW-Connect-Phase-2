"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { mapAdminRpcError } from "@/lib/admin/error-messages";
import type {
  AdminCourseProgressRow,
  AdminModuleProgressCount,
  AdminTestAttemptRow,
} from "@/lib/admin/types";
import { orgUnitName } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialProgress: AdminCourseProgressRow[];
  moduleCounts: AdminModuleProgressCount[];
  testAttempts: AdminTestAttemptRow[];
  locale: string;
};

const STATUS_KEY: Record<AdminCourseProgressRow["status"], string> = {
  in_progress: "statusInProgress",
  content_completed: "statusContentCompleted",
  certified: "statusCertified",
  failed_assessment: "statusFailedAssessment",
};

export function CourseProgressConsole({
  initialProgress,
  moduleCounts,
  testAttempts,
  locale,
}: Props) {
  const t = useTranslations("admin.courseProgress");
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    username: string;
    modulesCleared: number;
    testAttemptsCleared: number;
  } | null>(null);

  const moduleCountByProgressId = new Map(
    moduleCounts.map((row) => [row.course_progress_id, row.completed_count]),
  );

  function testAttemptsFor(courseId: string, bhwUserId: string) {
    return testAttempts.filter(
      (attempt) => attempt.course_id === courseId && attempt.bhw_user_id === bhwUserId,
    );
  }

  async function handleReset(row: AdminCourseProgressRow) {
    setError(null);
    setResult(null);
    setLoadingId(row.id);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("rpc_course_progress_reset", {
        p_course_id: row.course_id,
        p_bhw_user_id: row.bhw_user_id,
      });

      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }

      const outcome = (
        data as Array<{
          had_progress: boolean;
          modules_cleared: number;
          test_attempts_cleared: number;
        }> | null
      )?.[0];

      setResult({
        username: row.users?.username ?? "",
        modulesCleared: outcome?.modules_cleared ?? 0,
        testAttemptsCleared: outcome?.test_attempts_cleared ?? 0,
      });
      setConfirmingId(null);
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <p className="mt-1 text-sm text-ink/70">{t("description")}</p>
      </div>

      {result ? (
        <div className="flex items-start justify-between gap-4 rounded-md bg-celebration px-4 py-3 text-celebration-ink">
          <p role="status" className="text-sm">
            {t("resetSuccessNotice", {
              username: result.username,
              modules: result.modulesCleared,
              tests: result.testAttemptsCleared,
            })}
          </p>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="shrink-0 text-sm font-medium underline"
          >
            {t("dismiss")}
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {initialProgress.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="overflow-x-auto rounded-md border border-ink/10">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead className="bg-ink/5">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colBhw")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colCourse")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colStatus")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colModules")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colTests")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {initialProgress.map((row) => {
                const courseTitle =
                  locale === "en" ? row.courses?.title_en : row.courses?.title_fil;
                const attempts = testAttemptsFor(row.course_id, row.bhw_user_id);
                const pretest = attempts.find((a) => a.phase === "pretest");
                const posttest = attempts.find((a) => a.phase === "posttest");
                const isConfirming = confirmingId === row.id;
                const isLoading = loadingId === row.id;

                return (
                  <tr key={row.id} className="border-b border-ink/10 align-top">
                    <td className="px-3 py-3 text-sm text-ink">
                      <div className="font-medium">{row.users?.full_name}</div>
                      <div className="text-xs text-ink/60">
                        {row.users?.username} · {orgUnitName(row.users?.org_units) ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-ink">{courseTitle ?? "—"}</td>
                    <td className="px-3 py-3 text-sm text-ink">{t(STATUS_KEY[row.status])}</td>
                    <td className="px-3 py-3 text-sm text-ink">
                      {moduleCountByProgressId.get(row.id) ?? 0}
                    </td>
                    <td className="px-3 py-3 text-sm text-ink">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span>
                          {t("pretestLabel")}{" "}
                          {pretest ? `${pretest.score_percent}%` : t("notTaken")}
                        </span>
                        <span>
                          {t("posttestLabel")}{" "}
                          {posttest ? `${posttest.score_percent}%` : t("notTaken")}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {isConfirming ? (
                        <div className="flex flex-col gap-2">
                          <p role="alert" className="text-xs text-danger">
                            {t("resetWarning")}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleReset(row)}
                              className="rounded-md bg-danger px-2 py-1 text-xs font-medium text-canvas disabled:opacity-60"
                            >
                              {isLoading ? t("resetting") : t("resetConfirmAction")}
                            </button>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => setConfirmingId(null)}
                              className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink"
                            >
                              {t("cancelAction")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setConfirmingId(row.id);
                          }}
                          className="rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5"
                        >
                          {t("resetAction")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

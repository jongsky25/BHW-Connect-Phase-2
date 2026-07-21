import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import type { DashboardActivitySummary, DashboardBhwRow } from "@/lib/dashboard/types";
import { parseTimeRangeKey, timeRangeToDates } from "@/lib/dashboard/time-range";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const { start, end } = timeRangeToDates(parseTimeRangeKey(range));

  const supabase = await createClient();
  const t = await getTranslations("admin.dashboard.activity");
  const tUsers = await getTranslations("admin.users");

  const [{ data: summary }, { data: bhws }] = await Promise.all([
    supabase.rpc("rpc_dashboard_activity_summary", { p_start: start, p_end: end }).single<DashboardActivitySummary>(),
    supabase.rpc("rpc_dashboard_bhw_table", { p_start: start, p_end: end }),
  ]);

  const rows = (bhws ?? []) as DashboardBhwRow[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("cardActiveBhws")} value={`${summary?.pct_active_bhws ?? 0}%`} />
        <StatCard label={t("cardAvgSessions")} value={summary?.avg_sessions_per_bhw ?? 0} />
        <StatCard label={t("cardTotalQuestions")} value={summary?.total_questions_asked ?? 0} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t("tableHeading")}</h2>
        {rows.length === 0 ? (
          <EmptyState message={t("empty")} />
        ) : (
          <div className="overflow-x-auto rounded-md border border-ink/10">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="bg-ink/5">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                    {t("colName")}
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                    {t("colLastLogin")}
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                    {t("colQuestionsAsked")}
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                    {t("colStatus")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user_id} className="border-b border-ink/10">
                    <td className="px-3 py-3 text-sm text-ink">{row.full_name}</td>
                    <td className="px-3 py-3 text-sm text-ink">
                      {row.last_login_at ? new Date(row.last_login_at).toLocaleString() : t("neverLoggedIn")}
                    </td>
                    <td className="px-3 py-3 text-sm text-ink">{row.questions_asked}</td>
                    <td className="px-3 py-3 text-sm text-ink">
                      {tUsers(row.status === "active" ? "statusActive" : row.status === "invited" ? "statusInvited" : "statusDeactivated")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/empty-state";
import { AiStatusPanel } from "@/components/admin/dashboard/ai-status-panel";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import type { DashboardActivitySummary, DashboardBhwRow } from "@/lib/dashboard/types";
import { DASHBOARD_BHW_PAGE_SIZE, pageOffset, parsePageParam, parseSearchParam, totalPages } from "@/lib/dashboard/pagination";
import { parseTimeRangeKey, timeRangeToDates } from "@/lib/dashboard/time-range";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string; q?: string }>;
}) {
  const { range, page: pageParam, q: qParam } = await searchParams;
  const { start, end } = timeRangeToDates(parseTimeRangeKey(range));
  let page = parsePageParam(pageParam);
  const search = parseSearchParam(qParam);

  const supabase = await createClient();
  const t = await getTranslations("admin.dashboard.activity");
  const tUsers = await getTranslations("admin.users");

  const [{ data: summary }, { data: bhws }] = await Promise.all([
    supabase.rpc("rpc_dashboard_activity_summary", { p_start: start, p_end: end }).single<DashboardActivitySummary>(),
    supabase.rpc("rpc_dashboard_bhw_table", {
      p_start: start,
      p_end: end,
      p_search: search,
      p_limit: DASHBOARD_BHW_PAGE_SIZE,
      p_offset: pageOffset(page),
    }),
  ]);

  let rows = (bhws ?? []) as DashboardBhwRow[];
  let total = rows[0]?.total_count ?? 0;

  // A window-function total only comes back on a row that exists — a
  // request for a page past the end (a stale link, or a hand-edited URL)
  // returns zero rows and therefore an unreadable total, which would
  // otherwise render as a false "no BHWs match" instead of "that page
  // doesn't exist any more". Re-check against page 1 only in that case,
  // and redirect to the real last page rather than show a wrong empty state.
  if (rows.length === 0 && page > 1) {
    const { data: firstPage } = await supabase.rpc("rpc_dashboard_bhw_table", {
      p_start: start,
      p_end: end,
      p_search: search,
      p_limit: DASHBOARD_BHW_PAGE_SIZE,
      p_offset: 0,
    });
    const firstRows = (firstPage ?? []) as DashboardBhwRow[];
    const realTotal = firstRows[0]?.total_count ?? 0;
    const realLastPage = totalPages(realTotal);
    if (realLastPage !== page) {
      const params = new URLSearchParams();
      if (range) params.set("range", range);
      if (search) params.set("q", search);
      params.set("page", String(realLastPage));
      redirect(`/admin/dashboard?${params.toString()}`);
    }
    // realLastPage === page here can only mean the total shrank between
    // the two queries above, landing exactly back on the requested page —
    // fall through showing page 1's real content rather than a stale
    // "page 5 of 1" label.
    rows = firstRows;
    total = realTotal;
    page = 1;
  }

  const lastPage = totalPages(total);

  // Every link/form below carries `range` forward; the search form drops
  // `page` on purpose so a new search always starts at page 1.
  const baseParams = new URLSearchParams();
  if (range) baseParams.set("range", range);

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams(baseParams);
    if (search) params.set("q", search);
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("heading")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("cardActiveBhws")} value={`${summary?.pct_active_bhws ?? 0}%`} />
        <StatCard label={t("cardAvgSessions")} value={summary?.avg_sessions_per_bhw ?? 0} />
        <StatCard label={t("cardTotalQuestions")} value={summary?.total_questions_asked ?? 0} />
      </div>

      <AiStatusPanel />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t("tableHeading")}</h2>

        <form className="flex flex-wrap items-center gap-2" action="">
          {range ? <input type="hidden" name="range" value={range} /> : null}
          <label htmlFor="bhw-search" className="sr-only">
            {t("searchLabel")}
          </label>
          <input
            id="bhw-search"
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder={t("searchPlaceholder")}
            className="w-full max-w-xs rounded-md border border-ink/20 px-3 py-2 text-sm text-ink"
          />
          <button
            type="submit"
            className="rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
          >
            {t("searchButton")}
          </button>
          {search ? (
            <a href={`?${baseParams.toString()}`} className="text-sm font-medium text-ink underline hover:text-secondary">
              {t("clearSearch")}
            </a>
          ) : null}
        </form>

        {rows.length === 0 ? (
          <EmptyState message={search ? t("emptySearch", { query: search }) : t("empty")} />
        ) : (
          <>
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

            {lastPage > 1 ? (
              <div className="flex items-center justify-between gap-3 text-sm text-ink">
                {page > 1 ? (
                  <a href={pageHref(page - 1)} className="font-medium underline hover:text-secondary">
                    {t("prevPage")}
                  </a>
                ) : (
                  <span className="text-ink/40">{t("prevPage")}</span>
                )}
                <span className="text-ink/70">{t("pageOf", { page, totalPages: lastPage })}</span>
                {page < lastPage ? (
                  <a href={pageHref(page + 1)} className="font-medium underline hover:text-secondary">
                    {t("nextPage")}
                  </a>
                ) : (
                  <span className="text-ink/40">{t("nextPage")}</span>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

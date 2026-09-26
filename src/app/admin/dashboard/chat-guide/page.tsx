import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { DeflectionTrendTable } from "@/components/admin/dashboard/deflection-trend-table";
import { GapQueueList } from "@/components/admin/dashboard/gap-queue-list";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { TopTopicsList } from "@/components/admin/dashboard/top-topics-list";
import { buildGapQueueSearchPattern } from "@/lib/dashboard/gap-queue";
import { GAP_QUEUE_PAGE_SIZE, pageOffset, parsePageParam, parseSearchParam, totalPages } from "@/lib/dashboard/pagination";
import { parseTimeRangeKey, timeRangeToDates } from "@/lib/dashboard/time-range";
import type { DashboardTopTopic, DashboardTrendPoint, GapQueueRow } from "@/lib/dashboard/types";
import { createClient } from "@/lib/supabase/server";
import { getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function AdminDashboardChatGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string; q?: string }>;
}) {
  const { range, page: pageParam, q: qParam } = await searchParams;
  const { start, end } = timeRangeToDates(parseTimeRangeKey(range));
  let page = parsePageParam(pageParam);
  const search = parseSearchParam(qParam);

  const supabase = await createClient();
  const t = await getTranslations("admin.dashboard.chatGuide");
  const today = new Date().toISOString().slice(0, 10);

  function gapQueueQuery() {
    let query = supabase
      .from("unmatched_questions")
      .select("id, text, asked_count, reason, first_asked_at, last_asked_at", { count: "exact" })
      .eq("status", "open");
    if (search) {
      query = query.ilike("text", buildGapQueueSearchPattern(search));
    }
    return query
      .order("asked_count", { ascending: false })
      .order("last_asked_at", { ascending: false })
      .order("id", { ascending: true })
      .returns<GapQueueRow[]>();
  }

  const [{ data: gapPage, count: gapCount }, { data: topics }, { data: trend }, { count: staleCount }, flags] =
    await Promise.all([
      gapQueueQuery().range(pageOffset(page, GAP_QUEUE_PAGE_SIZE), pageOffset(page, GAP_QUEUE_PAGE_SIZE) + GAP_QUEUE_PAGE_SIZE - 1),
      supabase.rpc("rpc_dashboard_top_topics", { p_start: start, p_end: end }),
      supabase.rpc("rpc_dashboard_deflection_trend", { p_start: start, p_end: end }),
      supabase
        .from("kb_entries")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .lt("review_due_on", today),
      getRequestFeatureFlags(),
    ]);

  const gapRows = (gapPage ?? []) as GapQueueRow[];
  const gapTotal = gapCount ?? 0;

  // `count: "exact"` comes back on every response, including one for a page
  // past the end (a stale link, or a hand-edited URL), which returns zero
  // rows but the *real* total. Re-derive the real last page from it and
  // redirect there, rather than show a wrong "no open questions" empty state.
  if (gapRows.length === 0 && page > 1) {
    const realLastPage = totalPages(gapTotal, GAP_QUEUE_PAGE_SIZE);
    if (realLastPage !== page) {
      const params = new URLSearchParams();
      if (range) params.set("range", range);
      if (search) params.set("q", search);
      params.set("page", String(realLastPage));
      redirect(`/admin/dashboard/chat-guide?${params.toString()}`);
    }
    // realLastPage === page here can only mean the total shrank to zero
    // between the count and now — fall through with an empty page 1 rather
    // than loop trying to redirect to a page that no longer exists.
    page = 1;
  }

  const gapLastPage = totalPages(gapTotal, GAP_QUEUE_PAGE_SIZE);

  const topicRows = (topics ?? []) as DashboardTopTopic[];
  const trendRows = (trend ?? []) as DashboardTrendPoint[];

  // Every link/form below carries `range` forward; the search form drops
  // `page` on purpose so a new search always starts at page 1.
  const baseParams = new URLSearchParams();
  if (range) baseParams.set("range", range);

  function gapPageHref(targetPage: number): string {
    const params = new URLSearchParams(baseParams);
    if (search) params.set("q", search);
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t("gapQueueHeading")}</h2>

        <form className="flex flex-wrap items-center gap-2" action="">
          {range ? <input type="hidden" name="range" value={range} /> : null}
          <label htmlFor="gap-queue-search" className="sr-only">
            {t("gapQueueSearchLabel")}
          </label>
          <input
            id="gap-queue-search"
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder={t("gapQueueSearchPlaceholder")}
            className="w-full max-w-xs rounded-md border border-ink/20 px-3 py-2 text-sm text-ink"
          />
          <button
            type="submit"
            className="rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
          >
            {t("gapQueueSearchButton")}
          </button>
          {search ? (
            <a href={`?${baseParams.toString()}`} className="text-sm font-medium text-ink underline hover:text-secondary">
              {t("gapQueueClearSearch")}
            </a>
          ) : null}
        </form>

        <GapQueueList
          rows={gapRows}
          aiDraftEnabled={flags.ai_external && flags.ai_gap_draft}
          emptyMessage={search ? t("gapQueueEmptySearch", { query: search }) : undefined}
        />

        {gapRows.length > 0 && gapLastPage > 1 ? (
          <div className="flex items-center justify-between gap-3 text-sm text-ink">
            {page > 1 ? (
              <a href={gapPageHref(page - 1)} className="font-medium underline hover:text-secondary">
                {t("gapQueuePrevPage")}
              </a>
            ) : (
              <span className="text-ink/40">{t("gapQueuePrevPage")}</span>
            )}
            <span className="text-ink/70">{t("gapQueuePageOf", { page, totalPages: gapLastPage })}</span>
            {page < gapLastPage ? (
              <a href={gapPageHref(page + 1)} className="font-medium underline hover:text-secondary">
                {t("gapQueueNextPage")}
              </a>
            ) : (
              <span className="text-ink/40">{t("gapQueueNextPage")}</span>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t("topTopicsHeading")}</h2>
        <TopTopicsList topics={topicRows} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t("deflectionTrendHeading")}</h2>
        <DeflectionTrendTable points={trendRows} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t("staleContentHeading")}</h2>
        <StatCard label={t("staleContentCount")} value={staleCount ?? 0} />
      </div>
    </div>
  );
}

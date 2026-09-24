import { getTranslations } from "next-intl/server";
import { DeflectionTrendTable } from "@/components/admin/dashboard/deflection-trend-table";
import { GapQueueList } from "@/components/admin/dashboard/gap-queue-list";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { TopTopicsList } from "@/components/admin/dashboard/top-topics-list";
import { parseTimeRangeKey, timeRangeToDates } from "@/lib/dashboard/time-range";
import type { DashboardTopTopic, DashboardTrendPoint, GapQueueRow } from "@/lib/dashboard/types";
import { createClient } from "@/lib/supabase/server";
import { getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function AdminDashboardChatGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const { start, end } = timeRangeToDates(parseTimeRangeKey(range));

  const supabase = await createClient();
  const t = await getTranslations("admin.dashboard.chatGuide");
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: gapRows }, { data: topics }, { data: trend }, { count: staleCount }, flags] =
    await Promise.all([
      supabase
        .from("unmatched_questions")
        .select("id, text, asked_count, reason, first_asked_at, last_asked_at")
        .eq("status", "open")
        .order("asked_count", { ascending: false })
        .returns<GapQueueRow[]>(),
      supabase.rpc("rpc_dashboard_top_topics", { p_start: start, p_end: end }),
      supabase.rpc("rpc_dashboard_deflection_trend", { p_start: start, p_end: end }),
      supabase
        .from("kb_entries")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .lt("review_due_on", today),
      getRequestFeatureFlags(),
    ]);

  const topicRows = (topics ?? []) as DashboardTopTopic[];
  const trendRows = (trend ?? []) as DashboardTrendPoint[];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t("gapQueueHeading")}</h2>
        <GapQueueList rows={gapRows ?? []} aiDraftEnabled={flags.ai_external && flags.ai_gap_draft} />
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

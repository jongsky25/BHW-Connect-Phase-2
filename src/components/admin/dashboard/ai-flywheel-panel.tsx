import { getTranslations } from "next-intl/server";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { createClient } from "@/lib/supabase/server";

type FlywheelRow = {
  drafts_created: number;
  drafts_published: number;
  drafts_awaiting_review: number;
  gap_draft_calls: number;
};

// The number that makes "the system relies less and less on the LLM" checkable
// rather than aspirational. Drafts published is the flywheel turning: each one
// is a question that will be answered from the KB next time, with no AI call.
// Calls spent is the cost side, and the ratio between them is the whole thesis
// — if calls keep rising while published stays flat, the loop is not closing.
//
// A self-contained panel in the style of AiStatusPanel, deliberately not four
// more fields on rpc_reports_kpi_summary: widening a `returns table` on an
// unchanged argument list needs drop function + re-grant, which is avoidable
// churn in a function the whole reports tab depends on.
export async function AiFlywheelPanel({ start, end }: { start: string; end: string }) {
  const supabase = await createClient();
  const t = await getTranslations("admin.dashboard.aiFlywheel");

  const { data } = await supabase
    .rpc("rpc_dashboard_ai_flywheel", { p_start: start, p_end: end })
    .single<FlywheelRow>();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{t("heading")}</h2>
      <p className="text-sm text-ink/70">{t("intro")}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("draftsCreated")} value={data?.drafts_created ?? 0} />
        <StatCard label={t("draftsPublished")} value={data?.drafts_published ?? 0} />
        <StatCard label={t("awaitingReview")} value={data?.drafts_awaiting_review ?? 0} />
        <StatCard label={t("callsSpent")} value={data?.gap_draft_calls ?? 0} />
      </div>
    </div>
  );
}

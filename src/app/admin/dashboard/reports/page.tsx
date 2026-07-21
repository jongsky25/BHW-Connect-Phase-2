import { getTranslations } from "next-intl/server";
import { ReportExportPanel } from "@/components/admin/dashboard/report-export-panel";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { parseTimeRangeKey, timeRangeToDates } from "@/lib/dashboard/time-range";
import type { KpiSummary } from "@/lib/reports/types";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const { start, end } = timeRangeToDates(parseTimeRangeKey(range));

  const supabase = await createClient();
  const t = await getTranslations("admin.dashboard.reports");

  const { data: kpi } = await supabase
    .rpc("rpc_reports_kpi_summary", { p_start: start, p_end: end })
    .single<KpiSummary>();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("kpiActivation")} value={`${kpi?.activation_rate ?? 0}%`} />
        <StatCard label={t("kpiWau")} value={`${kpi?.wau_rate ?? 0}%`} />
        <StatCard label={t("kpiDeflection")} value={`${kpi?.deflection_rate ?? 0}%`} />
        <StatCard label={t("kpiCsat")} value={`${kpi?.csat_rate ?? 0}%`} />
      </div>

      <ReportExportPanel />
    </div>
  );
}

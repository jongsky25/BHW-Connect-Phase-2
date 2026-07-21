import { getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { parseTimeRangeKey, timeRangeToDates } from "@/lib/dashboard/time-range";
import type { DashboardActivitySummary } from "@/lib/dashboard/types";
import type { KpiSummary } from "@/lib/reports/types";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const appUser = await getAppUser(supabase, user.id);
  if (!appUser || appUser.role !== "admin") {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const rangeKey = parseTimeRangeKey(searchParams.get("range") ?? undefined);
  const { start, end } = timeRangeToDates(rangeKey);

  const [{ data: activity, error: activityError }, { data: kpi, error: kpiError }] = await Promise.all([
    supabase.rpc("rpc_dashboard_activity_summary", { p_start: start, p_end: end }).single<DashboardActivitySummary>(),
    supabase.rpc("rpc_reports_kpi_summary", { p_start: start, p_end: end }).single<KpiSummary>(),
  ]);

  if (activityError || kpiError) {
    return NextResponse.json({ error: (activityError ?? kpiError)?.message }, { status: 400 });
  }

  const t = await getTranslations("admin.dashboard.reports.pdf");

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.169, 0.141, 0.125);

  let y = 780;
  const left = 50;

  const drawLine = (text: string, options: { size?: number; useBold?: boolean; gap?: number } = {}) => {
    const { size = 12, useBold = false, gap = 20 } = options;
    page.drawText(text, { x: left, y, size, font: useBold ? bold : font, color: ink });
    y -= gap;
  };

  drawLine(t("title"), { size: 18, useBold: true, gap: 28 });
  drawLine(
    t("rangeLine", {
      start: new Date(start).toLocaleDateString(),
      end: new Date(end).toLocaleDateString(),
    }),
    { size: 10, gap: 30 },
  );

  drawLine(t("kpiHeading"), { size: 14, useBold: true, gap: 22 });
  drawLine(`${t("kpiActivation")}: ${kpi?.activation_rate ?? 0}%`);
  drawLine(`${t("kpiWau")}: ${kpi?.wau_rate ?? 0}%`);
  drawLine(`${t("kpiDeflection")}: ${kpi?.deflection_rate ?? 0}%`);
  drawLine(`${t("kpiCsat")}: ${kpi?.csat_rate ?? 0}%`, { gap: 30 });

  drawLine(t("activityHeading"), { size: 14, useBold: true, gap: 22 });
  drawLine(`${t("activityPctActive")}: ${activity?.pct_active_bhws ?? 0}%`);
  drawLine(`${t("activityAvgSessions")}: ${activity?.avg_sessions_per_bhw ?? 0}`);
  drawLine(`${t("activityTotalQuestions")}: ${activity?.total_questions_asked ?? 0}`);

  const bytes = await pdf.save();

  await supabase.rpc("rpc_report_exported", {
    p_report_type: "dashboard_summary",
    p_format: "pdf",
    p_columns: null,
  });

  const filename = `bhw-connect-dashboard-summary-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

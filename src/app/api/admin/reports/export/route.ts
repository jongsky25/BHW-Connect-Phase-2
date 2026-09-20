import ExcelJS from "exceljs";
import { getLocale, getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";
import { activityReportCellValue, parseActivityReportColumns } from "@/lib/reports/columns";
import { toCsv } from "@/lib/reports/csv";
import type { ActivityReportRow } from "@/lib/reports/types";
import { parseTimeRangeKey, timeRangeToDates } from "@/lib/dashboard/time-range";
import { getFeatureFlags } from "@/lib/flags/get-flags";
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

  const flags = await getFeatureFlags(supabase);
  if (!flags.reports_export) {
    return NextResponse.json({ error: "feature disabled" }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format");
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "invalid export format" }, { status: 400 });
  }

  const columns = parseActivityReportColumns(searchParams.get("columns"));
  const { start, end } = timeRangeToDates(parseTimeRangeKey(searchParams.get("range") ?? undefined));

  // p_limit: null is Postgres's own "no limit" (see the migration's own
  // comment) — explicit here rather than left to the RPC's default, since
  // an export silently truncated to a page size would be a real data loss
  // bug, not a UI inconvenience.
  const { data: bhws, error } = await supabase.rpc("rpc_dashboard_bhw_table", {
    p_start: start,
    p_end: end,
    p_search: null,
    p_limit: null,
    p_offset: 0,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (bhws ?? []) as ActivityReportRow[];
  const t = await getTranslations("admin.dashboard.reports.columns");
  const locale = await getLocale();
  const headers = columns.map((column) => t(column));
  const cellRows = rows.map((row) => columns.map((column) => activityReportCellValue(row, column)));

  await supabase.rpc("rpc_report_exported", {
    p_report_type: "activity",
    p_format: format,
    p_columns: columns,
  });

  const filenameBase = `bhw-connect-activity-report-${new Date().toISOString().slice(0, 10)}`;

  if (format === "csv") {
    return new NextResponse(toCsv(headers, cellRows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(locale === "en" ? "Activity" : "Aktibidad");
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  for (const row of cellRows) {
    sheet.addRow(row);
  }
  sheet.columns.forEach((column) => {
    column.width = 22;
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
    },
  });
}

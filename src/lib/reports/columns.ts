import type { ActivityReportColumnKey, ActivityReportRow } from "./types";

export const ACTIVITY_REPORT_COLUMNS: readonly ActivityReportColumnKey[] = [
  "full_name",
  "username",
  "status",
  "last_login_at",
  "questions_asked",
];

export function parseActivityReportColumns(value: string | null | undefined): ActivityReportColumnKey[] {
  if (!value) return [...ACTIVITY_REPORT_COLUMNS];
  const requested = value.split(",").map((key) => key.trim());
  const valid = requested.filter((key): key is ActivityReportColumnKey =>
    (ACTIVITY_REPORT_COLUMNS as readonly string[]).includes(key),
  );
  return valid.length > 0 ? valid : [...ACTIVITY_REPORT_COLUMNS];
}

export function activityReportCellValue(row: ActivityReportRow, column: ActivityReportColumnKey): string {
  switch (column) {
    case "full_name":
      return row.full_name;
    case "username":
      return row.username;
    case "status":
      return row.status;
    case "last_login_at":
      return row.last_login_at ?? "";
    case "questions_asked":
      return String(row.questions_asked);
  }
}

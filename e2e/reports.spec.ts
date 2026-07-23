import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { STABLE_ADMIN, getAccessToken, restGet } from "./fixtures/auth";

// INC-8 DoD: exported CSV/Excel columns match the field/column picker
// selection, and every export is recorded via the report.exported audit
// event. The CI Supabase project is shared and ever-growing across CI
// runs (see dashboard.spec.ts's own marker-based approach), so this test
// verifies column-picker fidelity and the audit trail deterministically
// rather than hand-computing exact row counts against accumulated history.
test("admin exports an activity report whose CSV/Excel columns match the picker selection, recorded in the audit log", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/dashboard/reports");
  await expect(page.getByRole("heading", { name: "Mga Ulat" })).toBeVisible();

  // Deselect two of the five columns, keeping Username, Huling login, and
  // Mga tanong na itinanong.
  await page.getByLabel("Pangalan").uncheck();
  await page.getByLabel("Status", { exact: true }).uncheck();

  const [csvDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "I-export bilang CSV" }).click(),
  ]);
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csvHeaderLine = readFileSync(csvPath as string, "utf-8").split("\r\n")[0].replace(/^﻿/, "");
  expect(csvHeaderLine).toBe("Username,Huling login,Mga tanong na itinanong");

  const [xlsxDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "I-export bilang Excel" }).click(),
  ]);
  const xlsxPath = await xlsxDownload.path();
  expect(xlsxPath).toBeTruthy();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath as string);
  const sheet = workbook.worksheets[0];
  const headerRow = sheet.getRow(1).values as unknown[];
  // ExcelJS's row.values is 1-indexed with a leading empty slot.
  expect(headerRow.slice(1)).toEqual(["Username", "Huling login", "Mga tanong na itinanong"]);

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const auditRows = (await restGet(
    request,
    adminToken,
    "audit_events?event_type=eq.report.exported&select=metadata&order=created_at.desc&limit=1",
  )) as Array<{ metadata: { report_type: string; format: string; columns: string[] } }>;
  expect(auditRows).toHaveLength(1);
  expect(auditRows[0].metadata.report_type).toBe("activity");
  expect(auditRows[0].metadata.format).toBe("xlsx");
  expect(auditRows[0].metadata.columns).toEqual(["username", "last_login_at", "questions_asked"]);
});

// The KPI panel's arithmetic (activation/WAU/deflection/CSAT) is unit-level
// deterministic Postgres SQL (see rpc_reports_kpi_summary); at the E2E layer
// — against the same shared, ever-growing pilot project as every other
// spec — the meaningful contract to verify is that each pilot KPI renders
// as a well-formed percentage, not a specific number.
test("reports dashboard renders a pilot-KPI panel with valid percentages", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/dashboard/reports");

  for (const label of ["Activation", "Lingguhang aktibo", "Deflection rate", "Kalidad ng sagot (CSAT)"]) {
    const card = page.getByText(label, { exact: true }).locator("..");
    await expect(card.getByText(/^\d+(\.\d+)?%$/)).toBeVisible();
  }
});

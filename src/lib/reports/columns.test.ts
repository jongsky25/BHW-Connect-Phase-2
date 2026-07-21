import { describe, expect, it } from "vitest";
import { activityReportCellValue, parseActivityReportColumns } from "./columns";
import type { ActivityReportRow } from "./types";

const row: ActivityReportRow = {
  user_id: "u1",
  full_name: "Juan Dela Cruz",
  username: "juan.delacruz",
  status: "active",
  last_login_at: "2026-07-20T10:00:00.000Z",
  questions_asked: 5,
};

describe("parseActivityReportColumns", () => {
  it("defaults to all columns when nothing is requested", () => {
    expect(parseActivityReportColumns(undefined)).toEqual([
      "full_name",
      "username",
      "status",
      "last_login_at",
      "questions_asked",
    ]);
  });

  it("keeps only the requested valid columns, in request order", () => {
    expect(parseActivityReportColumns("username,full_name")).toEqual(["username", "full_name"]);
  });

  it("drops unknown column keys and falls back to all columns if none are valid", () => {
    expect(parseActivityReportColumns("bogus,also_bogus")).toEqual([
      "full_name",
      "username",
      "status",
      "last_login_at",
      "questions_asked",
    ]);
    expect(parseActivityReportColumns("bogus,username")).toEqual(["username"]);
  });
});

describe("activityReportCellValue", () => {
  it("extracts each column's value as a string", () => {
    expect(activityReportCellValue(row, "full_name")).toBe("Juan Dela Cruz");
    expect(activityReportCellValue(row, "username")).toBe("juan.delacruz");
    expect(activityReportCellValue(row, "status")).toBe("active");
    expect(activityReportCellValue(row, "last_login_at")).toBe("2026-07-20T10:00:00.000Z");
    expect(activityReportCellValue(row, "questions_asked")).toBe("5");
  });

  it("renders a null last_login_at as an empty string", () => {
    expect(activityReportCellValue({ ...row, last_login_at: null }, "last_login_at")).toBe("");
  });
});

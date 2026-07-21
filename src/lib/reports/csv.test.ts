import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins headers and rows with CRLF, prefixed with a UTF-8 BOM", () => {
    const csv = toCsv(["Name", "Count"], [["Maria", "3"]]);
    expect(csv).toBe("﻿Name,Count\r\nMaria,3\r\n");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv(["Name"], [['Doe, "Jane"'], ["Line1\nLine2"]]);
    expect(csv).toContain('"Doe, ""Jane"""');
    expect(csv).toContain('"Line1\nLine2"');
  });

  it("leaves plain fields unquoted", () => {
    const csv = toCsv(["Name"], [["Juan Dela Cruz"]]);
    expect(csv).toContain("Juan Dela Cruz\r\n");
    expect(csv).not.toContain('"Juan Dela Cruz"');
  });
});

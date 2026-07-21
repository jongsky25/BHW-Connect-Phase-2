// Excel needs a UTF-8 BOM to render non-ASCII characters (Filipino names,
// ñ, etc.) correctly instead of guessing a legacy code page.
const UTF8_BOM = "﻿";

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((line) => line.map(escapeCsvField).join(","));
  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}

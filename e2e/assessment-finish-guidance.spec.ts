import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

test("the actual assessment components guide review and confirmation in an isolated browser", () => {
  const output = execFileSync(process.execPath, ["scripts/chapter1-browser-smoke.mjs"], {
    encoding: "utf8", timeout: 45_000,
  });
  expect(output).toContain("Browser journey passed: finish guidance");
});

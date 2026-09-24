// Run only against reference-local-app.mjs; resets named disposable fixture learners.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const f = JSON.parse(
  fs.readFileSync("test-results/local-reference-app/fixture.json"),
);
assert.equal(f.api, "http://127.0.0.1:55434");
const base = "http://127.0.0.1:4175";
const checks = [],
  errors = [];
async function rest(table) {
  const r = await fetch(f.api + "/rest/v1/" + table, {
    headers: { Authorization: "Bearer " + f.tokens.new, apikey: f.anon },
  });
  assert.ok(r.ok);
  return r.json();
}
(async () => {
  const { Client } = require(process.env.PG_TEST_MODULE || "pg");
  assert.ok(f.database.startsWith("bhw_reference_app_"));
  const db = new Client({
    host: "127.0.0.1",
    port: 55432,
    user: "postgres",
    database: f.database,
  });
  await db.connect();
  await db.query("delete from course_test_questions where course_id=$1", [
    f.fixture.course,
  ]);
  for (const table of [
    "course_lesson_progress",
    "course_lesson_resume",
    "course_module_progress",
  ])
    await db.query(
      "delete from " +
        table +
        " where course_progress_id in (select id from course_progress where bhw_user_id=$1)",
      [f.fixture.users.new.id],
    );
  await db.query("delete from course_progress where bhw_user_id=$1", [
    f.fixture.users.new.id,
  ]);
  await db.end();
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addCookies([
      {
        name: "sb-127-auth-token",
        value:
          "base64-" +
          Buffer.from(JSON.stringify(f.sessions.new)).toString("base64url"),
        url: base,
      },
    ]);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("/rest/v1/rpc/") && r.status() >= 400)
        errors.push(r.status() + " " + r.url());
    });
    await page.goto(base + "/courses/" + f.fixture.course);
    const region = page.getByRole("region", { name: /Kabanata I|Chapter I/ });
    const btn = (name) => region.getByRole("button", { name, exact: true });
    await expect(region).toContainText("0 / 6");
    await btn("Ipagpatuloy ang pag-aaral").click();
    await expect(region.locator("article")).toBeVisible();
    await btn("Susunod").click();
    const readHeading = await region.locator("h2").innerText();
    await btn("Slides").click();
    await btn("Susunod").click();
    const slideHeading = await region.locator("h2").innerText();
    await expect
      .poll(async () => (await rest("course_lesson_resume?select=*")).length)
      .toBe(2);
    checks.push("Read and Slides save separate positions through REST");
    await btn("Basahin").click();
    await expect(region.locator("h2")).toHaveText(readHeading);
    await btn("Slides").click();
    await expect(region.locator("h2")).toHaveText(slideHeading);
    checks.push("Switching modes restores each position");
    await page.reload();
    await btn("Ipagpatuloy ang pag-aaral").click();
    await expect(region.locator("h2")).toHaveText(slideHeading);
    await expect(btn("Slides")).toHaveAttribute("aria-pressed", "true");
    checks.push("Server-backed resume survives full reload");
    const filScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      filScan.violations.map((v) => v.id),
      [],
    );
    checks.push("Filipino Slides passes axe WCAG A/AA");
    await page.getByRole("button", { name: "English", exact: true }).click();
    await expect(btn("Read")).toBeVisible();
    await expect(region).toContainText("Lesson 1 / 6");
    await btn("Next").focus();
    await page.keyboard.press("Enter");
    await expect(region.locator("h2")).toBeFocused();
    checks.push(
      "Language switching and keyboard navigation retain lesson context",
    );
    while (await btn("Next").isEnabled()) await btn("Next").click();
    const options = region.locator("fieldset button");
    if (await options.count()) {
      await options.first().click();
      await expect(region.getByRole("status")).toBeVisible();
      checks.push("Practice feedback appears after answering");
    }
    await expect
      .poll(async () => (await rest("course_lesson_progress?select=*")).length)
      .toBe(0);
    checks.push("Viewing Slides does not mark a lesson complete");
    await btn("Mark lesson complete").click();
    await expect(btn("Completed")).toBeDisabled();
    await btn("Read").click();
    await expect(btn("Completed")).toBeDisabled();
    checks.push("Explicit completion is shared by Read and Slides");
    await page.screenshot({
      path: "test-results/local-reference-app/BHW-app-mobile.png",
      fullPage: true,
    });
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    checks.push("Mobile production stylesheet passes axe WCAG A/AA scan");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    for (let i = 1; i < 6; i++) {
      await btn("Next lesson").click();
      await expect(region).toContainText("Lesson " + (i + 1) + " / 6");
      await btn("Slides").click();
      while (await btn("Next").isEnabled()) await btn("Next").click();
      await btn("Mark lesson complete").click();
      await expect(btn("Completed")).toBeDisabled();
    }
    await expect(region).toContainText("6 / 6");
    await expect
      .poll(async () => (await rest("course_lesson_progress?select=*")).length)
      .toBe(6);
    await page.reload();
    await expect(region).toContainText("6 / 6");
    checks.push("All six lessons complete once and persist after reload");
    await page
      .getByRole("button", { name: "The BHW and HEPO ✓", exact: true })
      .click();
    await page.setViewportSize({ width: 320, height: 800 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "test-results/local-reference-app/BHW-app-320px.png",
      fullPage: true,
    });
    checks.push("320px reflow has no horizontal overflow");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: "test-results/local-reference-app/BHW-app-desktop.png",
      fullPage: true,
    });
    await page.goto(base + "/courses/" + f.generic);
    await expect(
      page.getByText("Original reader.", { exact: true }),
    ).toBeVisible();
    assert.equal(
      await page.getByRole("region", { name: "Chapter I lessons" }).count(),
      0,
    );
    checks.push("Generic course preserves its legacy reader");
    assert.deepEqual(errors, []);
    checks.push("No browser exceptions or failed progress RPCs");
    console.log(
      JSON.stringify({ checks, axeViolations: axe.violations.length }, null, 2),
    );
    fs.writeFileSync(
      "test-results/local-reference-app/BHW-app-browser-results.json",
      JSON.stringify({ checks, axeViolations: axe.violations.length }, null, 2),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

// Run only against reference-local-app.mjs; resets named disposable fixture learners.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Client } = require(process.env.PG_TEST_MODULE || "pg");
const f = JSON.parse(
  fs.readFileSync("test-results/local-reference-app/fixture.json"),
);
assert.ok(f.database.startsWith("bhw_reference_app_"));
assert.equal(f.api, "http://127.0.0.1:55434");
const base = "http://127.0.0.1:4175",
  checks = [];
(async () => {
  const db = new Client({
    host: "127.0.0.1",
    port: 55432,
    user: "postgres",
    database: f.database,
  });
  await db.connect();
  for (const table of [
    "course_lesson_progress",
    "course_lesson_resume",
    "course_module_progress",
  ])
    await db.query(
      "delete from " +
        table +
        " where course_progress_id in (select id from course_progress where bhw_user_id=$1)",
      [f.fixture.users.racer.id],
    );
  for (const table of [
    "course_test_attempts",
    "assessments",
    "course_progress",
  ])
    await db.query("delete from " + table + " where bhw_user_id=$1", [
      f.fixture.users.racer.id,
    ]);
  const before = JSON.stringify(
    (
      await db.query("select * from certificates where bhw_user_id=$1", [
        f.fixture.users.certified.id,
      ])
    ).rows,
  );
  await db.query(
    `insert into course_test_questions(course_id,position,prompt_fil,prompt_en,options,correct_option_index) values($1,0,'Tanong sa lokal na pagsubok','Local fixture question',$2,0) on conflict(course_id,position) do nothing`,
    [
      f.fixture.course,
      JSON.stringify([
        { fil: "Tamang sagot", en: "Fixture correct answer" },
        { fil: "Ibang sagot", en: "Fixture other answer" },
      ]),
    ],
  );
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    async function pageFor(name) {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      await ctx.addCookies([
        {
          name: "sb-127-auth-token",
          value:
            "base64-" +
            Buffer.from(JSON.stringify(f.sessions[name])).toString("base64url"),
          url: base,
        },
        { name: "BHW_LOCALE", value: "en", url: base },
      ]);
      const page = await ctx.newPage();
      await page.goto(base + "/courses/" + f.fixture.course);
      return page;
    }
    const page = await pageFor("racer");
    await expect(
      page.getByRole("heading", { name: "Pretest", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue learning", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("radio", { name: "Fixture correct answer" }).check();
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Continue learning", exact: true }),
    ).toBeVisible();
    checks.push(
      "Pretest gates lessons and unlocks them after successful submission",
    );
    const region = page.getByRole("region", { name: "Chapter I lessons" });
    await region
      .getByRole("button", { name: "Continue learning", exact: true })
      .click();
    for (let i = 0; i < 6; i++) {
      await region
        .getByRole("button", { name: "Mark lesson complete", exact: true })
        .click();
      await expect(
        region.getByRole("button", { name: "Completed", exact: true }),
      ).toBeDisabled();
      if (i < 5)
        await region
          .getByRole("button", { name: "Next lesson", exact: true })
          .click();
    }
    await expect(
      page.getByRole("heading", { name: "Posttest", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Mark as done", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Posttest", exact: true }),
    ).toBeVisible();
    await page.getByRole("radio", { name: "Fixture correct answer" }).check();
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(
      page.getByText("Posttest score: 100%.", { exact: true }),
    ).toBeVisible();
    checks.push(
      "Posttest requires all lesson and legacy modules, then records the score",
    );
    const counts = (
      await db.query(
        "select status from course_progress where bhw_user_id=$1 and course_id=$2",
        [f.fixture.users.racer.id, f.fixture.course],
      )
    ).rows;
    assert.equal(counts[0].status, "content_completed");
    checks.push(
      "Course reaches content_completed without issuing a certificate",
    );
    assert.equal(
      (
        await db.query("select * from certificates where bhw_user_id=$1", [
          f.fixture.users.racer.id,
        ])
      ).rowCount,
      0,
    );
    const certified = await pageFor("certified");
    await expect(
      certified.getByRole("heading", { name: "Pretest", exact: true }),
    ).toHaveCount(0);
    await certified
      .getByRole("button", { name: "The BHW and HEPO", exact: true })
      .click();
    await expect(certified.locator("article")).toBeVisible();
    assert.equal(
      JSON.stringify(
        (
          await db.query("select * from certificates where bhw_user_id=$1", [
            f.fixture.users.certified.id,
          ])
        ).rows,
      ),
      before,
    );
    checks.push(
      "Certified learners can review without a historical pretest; certificate unchanged",
    );
    const scan = await new AxeBuilder({ page: certified })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      scan.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    checks.push("Desktop certified review passes axe WCAG A/AA");
    await certified
      .getByRole("button", { name: "Slides", exact: true })
      .click();
    await certified.evaluate(() => (document.documentElement.style.zoom = "2"));
    assert.ok(
      await certified.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await certified.screenshot({
      path: "test-results/local-reference-app/BHW-app-200-percent.png",
      fullPage: true,
    });
    checks.push("Slides at 200% CSS zoom have no horizontal overflow");
    const outside = await pageFor("outside");
    await expect(outside.getByText("404", { exact: true })).toBeVisible();
    checks.push("Out-of-scope user cannot open the course");
    console.log(JSON.stringify({ checks }, null, 2));
    fs.writeFileSync(
      "test-results/local-reference-app/BHW-app-gates-results.json",
      JSON.stringify({ checks }, null, 2),
    );
  } finally {
    await browser.close();
    await db.end();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

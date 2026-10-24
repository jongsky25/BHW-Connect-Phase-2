import { expect, test } from "@playwright/test";
import { STABLE_BHW } from "./fixtures/auth";

test("a BHW finds personal test history from Courses on mobile", async ({ page }) => {
  const backend = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost");
  test.skip(!["127.0.0.1", "localhost"].includes(backend.hostname), "Disposable local backend required");
  await page.goto("/my-results");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/courses");
  await page.getByRole("link", { name: /My test results|Aking mga resulta sa pagsusulit/ }).click();
  await expect(page).toHaveURL("/my-results");
  await expect(page.getByRole("heading", { name: /My test results|Aking mga resulta sa pagsusulit/ })).toBeVisible();
  // Next.js also renders a route announcer with role="alert". Check the results panel specifically.
  await expect(page.locator('section[role="alert"]')).toHaveCount(0);
  await expect(page.getByRole("region", { name: /My test results|Aking mga resulta sa pagsusulit/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

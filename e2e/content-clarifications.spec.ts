import { expect, test } from "@playwright/test";
import { STABLE_BHW } from "./fixtures/auth";

test("a BHW reviews the four clarification topics from Courses on mobile", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/courses");
  await page.getByRole("link", { name: /Content clarifications.*pilot|Mga paglilinaw sa aralin.*pilot/ }).click();
  await expect(page).toHaveURL("/content-clarifications");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(4);
  await page.getByRole("link", { name: "A provider network and a referral are different" }).click();
  await expect(page).toHaveURL(/#network-referral$/);
  const topic = page.locator("#network-referral");
  await topic.getByText("Show a possible response", { exact: true }).click();
  await expect(topic.getByText(/Sam asks about the provider network/)).toBeVisible();
  await page.getByRole("button", { name: "Filipino", exact: true }).click();
  await expect(page.getByRole("article", { name: "Magkaiba ang provider network at referral" })).toBeVisible();
  await expect(topic.getByText(/Tungkol sa provider network ang tanong ni Sam/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

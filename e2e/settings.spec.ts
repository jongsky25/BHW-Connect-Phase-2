import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  createThrowawayBhw,
  getAccessToken,
  onboardThroughLogin,
} from "./fixtures/auth";

// INC-7 DoD: settings persist to the profile and survive logout/login and a
// second device (not just a local cookie).
test("settings persist across sessions and apply immediately on save", async ({ page, request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, "Fresh-Settings-2026");

  await page.goto("/settings");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");

  // The form itself still renders in the pre-save locale (Filipino, the
  // default) right up until submit triggers a refresh with the new
  // profile language — so every button clicked here except the language
  // picker itself (whose "English"/"Filipino" labels are identical in
  // both catalogs) must be targeted by its Filipino label. The site
  // header's own LanguageToggle also renders an "English" button on every
  // page, so scope to <main> to hit the settings form's copy instead.
  const main = page.getByRole("main");
  await main.getByRole("button", { name: "English" }).click();
  await main.getByRole("button", { name: "Madilim" }).click();
  await main.getByRole("button", { name: "Sobrang Laki" }).click();
  await main.getByLabel("Mataas na Contrast").check();
  await main.getByRole("button", { name: "I-save ang mga setting" }).click();

  await expect(
    page.getByText(/Na-save na ang iyong mga setting\.|Your settings have been saved\./),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-font-scale", "xl");
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");

  const a11yScan = await new AxeBuilder({ page }).include("main").analyze();
  expect(a11yScan.violations).toEqual([]);

  // A fresh, cookie-less browser context stands in for "a second device":
  // no BHW_LOCALE cookie exists, so the theme/font/contrast/language must
  // come from the profile alone.
  const secondDevice = await page.context().browser()!.newContext();
  const secondPage = await secondDevice.newPage();
  await secondPage.goto("/login");
  // No session yet on this "device", so the login page itself still renders
  // in the cookie/default locale (fil) — only post-login pages read the
  // profile's language.
  await secondPage.getByLabel("Username").fill(fresh.username);
  await secondPage.getByLabel("Password").fill("Fresh-Settings-2026");
  await secondPage.getByRole("button", { name: "Mag-login" }).click();

  await expect(secondPage).toHaveURL("/home", { timeout: 10_000 });
  await expect(secondPage.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(secondPage.locator("html")).toHaveAttribute("data-font-scale", "xl");
  await expect(secondPage.locator("html")).toHaveAttribute("data-contrast", "high");
  await expect(secondPage.getByRole("heading", { name: new RegExp(fresh.fullName) })).toBeVisible();

  await secondDevice.close();
});

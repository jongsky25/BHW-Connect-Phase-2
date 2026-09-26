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

  // The page still renders in the pre-save locale (Filipino, the default)
  // right up until the Language section's own Save triggers a refresh with
  // the new profile language — so the language radio (and its Save button)
  // are targeted by their Filipino label, and everything after the refresh
  // by its English label. The site header's own LanguageToggle also renders
  // an "English" control on every page, so scope to <main> throughout.
  const main = page.getByRole("main");
  await main.getByRole("radio", { name: "English" }).click();
  await main.getByRole("button", { name: "I-save ang mga setting" }).click();
  await expect(
    page.getByText(/Na-save na ang iyong mga setting\.|Your settings have been saved\./),
  ).toBeVisible({ timeout: 10_000 });

  // Display settings (increment 2.4) apply instantly and save on their own
  // debounce — there's no submit button for them. Each click is reflected
  // on <html> immediately; the three clicks below land inside one debounce
  // window and are expected to reach the server as a single save.
  await main.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await main.getByRole("radio", { name: "Extra large" }).click();
  await main.getByRole("radio", { name: "High" }).click();

  await expect(main.getByText("Your settings have been saved.")).toBeVisible({ timeout: 10_000 });
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

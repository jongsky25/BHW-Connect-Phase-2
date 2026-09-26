import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  createThrowawayBhw,
  getAccessToken,
  onboardThroughLogin,
} from "./fixtures/auth";

const NEW_PASSWORD = "Fresh-HeaderTheme-2026";

// INC 1.5 DoD: axe-core clean on the header, the ☰ drawer and the desktop
// "More" menu in both themes. Provisions a throwaway BHW (rather than
// reusing bhw.stable) since setting the theme mutates the account's row.
async function setTheme(page: Page, userToken: string, theme: "light" | "dark") {
  await page.request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_update_settings`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    data: { p_language: "en", p_theme: theme, p_font_scale: "base", p_high_contrast: false },
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`header, drawer and More menu have no axe violations in ${theme} mode`, async ({ page, request }) => {
    const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
    const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

    await onboardThroughLogin(page, fresh.username, fresh.tempPassword, NEW_PASSWORD);

    const userToken = await getAccessToken(request, fresh.username, NEW_PASSWORD);
    await setTheme(page, userToken, theme);

    // Desktop: header with the "More" menu open.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/home");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();

    const desktopScan = await new AxeBuilder({ page }).include("header").analyze();
    expect(desktopScan.violations, `axe violations in the header/More menu (${theme})`).toEqual([]);

    // Mobile: header with the ☰ drawer open.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/home");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog", { name: "Main menu" })).toBeVisible();

    const mobileScan = await new AxeBuilder({ page }).include("header").include("dialog").analyze();
    expect(mobileScan.violations, `axe violations in the header/drawer (${theme})`).toEqual([]);
  });
}

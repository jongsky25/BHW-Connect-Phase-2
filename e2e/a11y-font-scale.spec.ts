import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  createThrowawayBhw,
  getAccessToken,
  onboardThroughLogin,
} from "./fixtures/auth";

const NEW_PASSWORD = "Fresh-FontScale-2026";

// INC-7 DoD: axe-core clean on Phase 1 routes at large font scales (the
// scale most likely to break tap-target size / overlap, since it grows
// text without growing the viewport). Sets font_scale directly via REST
// (rpc_update_settings) rather than driving the settings UI, since the
// scale itself — not the settings form — is what's under test here.
test("Phase 1 routes have no axe-core violations at the largest font scale", async ({ page, request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, NEW_PASSWORD);

  const userToken = await getAccessToken(request, fresh.username, NEW_PASSWORD);
  await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_update_settings`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    data: { p_language: "en", p_theme: "light", p_font_scale: "xl", p_high_contrast: false },
  });

  for (const path of ["/home", "/chat", "/kb", "/kb/mch", "/settings"]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-font-scale", "xl");
    const scan = await new AxeBuilder({ page }).include("main").analyze();
    expect(scan.violations, `axe violations on ${path}`).toEqual([]);
  }
});

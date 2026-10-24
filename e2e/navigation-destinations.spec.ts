import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { BARANGAY_BATONG_MALAKE_ID, STABLE_ADMIN, createThrowawayBhw, getAccessToken, onboardThroughLogin } from "./fixtures/auth";
import en from "../messages/en.json";
import fil from "../messages/fil.json";

// Language writes belong only to a new disposable local account.
test("Home explains destinations and KB separates reference collections in both languages", async ({ page, request }) => {
  const backend = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost");
  test.skip(!["127.0.0.1", "localhost"].includes(backend.hostname), "Disposable backend required");
  test.setTimeout(120_000);
  const admin = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, admin, BARANGAY_BATONG_MALAKE_ID);
  const password = "NavigationDest2026!";
  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, password);
  const token = await getAccessToken(request, fresh.username, password);
  for (const locale of ["en", "fil"] as const) {
    const messages = locale === "en" ? en : fil;
    const settings = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_update_settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}` },
      data: { p_language: locale, p_theme: "light", p_font_scale: "md", p_high_contrast: false },
    });
    expect(settings.ok()).toBe(true);
    await page.goto("/home");
    const destinations = page.getByRole("navigation", { name: messages.destinations.heading });
    const kb = destinations.getByRole("link", { name: messages.authHome.kbBrowseCta, exact: true });
    await expect(kb).toHaveAccessibleDescription(messages.destinations.kb);
    await expect(destinations.getByRole("link", { name: messages.authHome.adminConsoleCta })).toHaveCount(0);
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.locator("html").evaluate(html => html.setAttribute("data-font-scale", "xl"));
      expect(await destinations.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      if (width < 1280) {
        await page.locator("header").getByRole("button", { name: messages.common.openMenuLabel }).click();
        const drawer = page.getByRole("dialog", { name: messages.common.mainMenuLabel });
        await expect(drawer.getByRole("link", { name: messages.authHome.kbBrowseCta, exact: true })).toHaveAccessibleDescription(messages.destinations.kb);
        await drawer.getByRole("button", { name: messages.common.closeMenuLabel }).click();
      } else {
        const header = page.locator("header");
        await header.getByRole("button", { name: messages.common.moreLabel, exact: true }).click();
        await expect(header.getByRole("link", { name: messages.authHome.settingsCta, exact: true })).toHaveAccessibleDescription(messages.destinations.settings);
        await page.keyboard.press("Escape");
      }
    }
    for (const theme of ["light", "dark"]) {
      await page.locator("html").evaluate((html, value) => html.setAttribute("data-theme", value), theme);
      expect((await new AxeBuilder({ page }).include("#home-destinations-heading").include('nav[aria-labelledby="home-destinations-heading"]').analyze()).violations).toEqual([]);
    }
    await kb.click();
    await expect(page).toHaveURL("/kb");
    const hhp = page.getByRole("region", { name: "HHP+ / PhilPEN", exact: true });
    const topicLink = hhp.getByRole("link").first();
    await expect(topicLink).toHaveAccessibleDescription(locale === "en" ? "HHP+ / PhilPEN · Module 1 of 6" : "HHP+ / PhilPEN · Modyul 1 sa 6");
    const general = page.getByRole("region", { name: locale === "en" ? "Additional health topics" : "Iba pang paksa sa kalusugan" });
    const mch = general.getByRole("link", { name: locale === "en" ? "Maternal & Child Health" : "Kalusugan ng Ina at Bata" });
    await expect(mch).toHaveAccessibleDescription(locale === "en" ? "Reference topic" : "Paksang sanggunian");
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator("html").evaluate(html => html.setAttribute("data-font-scale", "xl"));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await topicLink.click();
    await expect(page).toHaveURL(/\/kb\/hhp-m1-care-pathway$/);
    await expect(page.getByText(locale === "en" ? "HHP+ / PhilPEN · Module 1 of 6" : "HHP+ / PhilPEN · Modyul 1 sa 6", { exact: true })).toBeVisible();
    await expect(page.locator('details[id^="entry-"]')).not.toHaveCount(0);
  }
});

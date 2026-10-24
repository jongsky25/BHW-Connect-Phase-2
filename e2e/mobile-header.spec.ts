import { expect, test } from "@playwright/test";
import { BARANGAY_BATONG_MALAKE_ID, STABLE_ADMIN, createThrowawayBhw, getAccessToken, onboardThroughLogin } from "./fixtures/auth";
import en from "../messages/en.json";
import fil from "../messages/fil.json";

// Preference writes are confined to a new disposable account in the local CI database.
test("mobile header and search fit narrow screens and enlarged text in both languages", async ({ page, request }) => {
  const backend = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost");
  test.skip(!["127.0.0.1", "localhost"].includes(backend.hostname), "Disposable local backend required");
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);
  const password = "Fresh-MobileHeader-2026";
  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, password);
  const token = await getAccessToken(request, fresh.username, password);

  for (const locale of ["en", "fil"] as const) {
    const messages = locale === "en" ? en : fil;
    const settings = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_update_settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, Authorization: `Bearer ${token}` },
      data: { p_language: locale, p_theme: "light", p_font_scale: "md", p_high_contrast: false },
    });
    expect(settings.ok()).toBe(true);
    await page.goto("/home");
    const header = page.locator("header");
    const search = header.getByRole("button", { name: messages.search.triggerLabel });
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const scale of ["md", "xl"]) {
        // Exercise the same CSS attributes as Display, without mutating account preferences.
        await page.locator("html").evaluate((html, value) => html.setAttribute("data-font-scale", value), scale);
        const bounds = await header.evaluate(element => {
          const rect = element.getBoundingClientRect();
          return { right: rect.right, bottom: rect.bottom, viewport: innerWidth };
        });
        expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
        const controls = await header.locator('button, a[href="/notifications"]').evaluateAll(elements =>
          elements.filter(element => element.getClientRects().length).map(element => {
            const rect = element.getBoundingClientRect();
            return { name: element.getAttribute("aria-label"), left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          }));
        for (const control of controls) {
          expect(control.left, control.name ?? "control").toBeGreaterThanOrEqual(0);
          expect(control.right, control.name ?? "control").toBeLessThanOrEqual(width);
          // Desktop More is a text navigation item, checked separately by existing axe tests.
          if (control.name) {
            expect(control.width, control.name).toBeGreaterThanOrEqual(44);
            expect(control.height, control.name).toBeGreaterThanOrEqual(44);
          }
        }
        await search.click();
        await expect(header.getByRole("combobox")).toBeFocused();
        const panel = await header.locator("#global-search-panel").boundingBox();
        expect(panel).not.toBeNull();
        expect(panel!.x).toBeGreaterThanOrEqual(0);
        expect(panel!.x + panel!.width).toBeLessThanOrEqual(width);
        const triggerBounds = await search.boundingBox();
        expect(panel!.y).toBeGreaterThanOrEqual(triggerBounds!.y + triggerBounds!.height);
        await header.getByRole("button", { name: messages.search.closeLabel }).click();
        await expect(search).toBeFocused();
        await expect(search).toHaveAttribute("aria-expanded", "false");
      }
    }
    await page.setViewportSize({ width: 320, height: 844 });
    await header.getByRole("button", { name: messages.common.openMenuLabel }).click();
    const drawer = page.getByRole("dialog", { name: messages.common.mainMenuLabel });
    await expect(drawer.getByRole("link", { name: messages.authHome.coursesCta, exact: true })).toBeVisible();
    await drawer.getByRole("button", { name: messages.common.closeMenuLabel }).click();
  }
});

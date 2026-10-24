import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { BARANGAY_BATONG_MALAKE_ID, STABLE_ADMIN, createThrowawayBhw, getAccessToken, onboardThroughLogin, restGet } from "./fixtures/auth";
import en from "../messages/en.json";
import fil from "../messages/fil.json";

test("a personal greeting survives a new sign-in and can be cleared without changing the official name", async ({ page, request, context }) => {
  const backend = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost");
  test.skip(!["localhost", "127.0.0.1"].includes(backend.hostname), "Disposable local backend required");
  test.setTimeout(120_000);
  const admin = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, admin, BARANGAY_BATONG_MALAKE_ID);
  const password = "GreetingName2026!";
  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, password);
  const token = await getAccessToken(request, fresh.username, password);
  const profile = () => restGet(request, admin, `users?select=full_name,role,org_unit_id&username=eq.${fresh.username}`);
  const before = await profile();
  for (const locale of ["en", "fil"] as const) {
    const messages = locale === "en" ? en : fil;
    const chosen = locale === "en" ? "Ray Justin" : "RJ";
    const settings = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_update_settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}` },
      data: { p_language: locale, p_theme: "light", p_font_scale: "md", p_high_contrast: false },
    });
    expect(settings.ok()).toBe(true);
    await page.goto("/settings");
    const form = page.getByRole("region", { name: messages.greetingName.heading });
    await form.getByLabel(messages.greetingName.label).fill(`  ${chosen}  `);
    await form.getByRole("button", { name: messages.greetingName.save, exact: true }).click();
    await expect(form.getByRole("status")).toHaveText(messages.greetingName.saved);
    await form.getByRole("link", { name: messages.greetingName.viewHome }).click();
    const greeting = messages.authHome.heading.replace("{name}", chosen);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(greeting);

    // Remove browser state, then establish another session for the same account.
    await context.clearCookies();
    await page.goto("/login");
    await page.getByLabel("Username").fill(fresh.username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Mag-login", exact: true }).click();
    await expect(page).toHaveURL("/home", { timeout: 10_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(greeting);
    await page.goto("/settings");
    await expect(form.getByLabel(messages.greetingName.label)).toHaveValue(chosen);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator("html").evaluate(html => html.setAttribute("data-font-scale", "xl"));
    expect(await form.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    for (const theme of ["light", "dark"]) {
      await page.locator("html").evaluate((html, value) => html.setAttribute("data-theme", value), theme);
      expect((await new AxeBuilder({ page }).include('section[aria-labelledby="greeting-name-heading"]').analyze()).violations).toEqual([]);
    }
    expect(await profile()).toEqual(before);
    await form.getByLabel(messages.greetingName.label).fill("");
    await form.getByRole("button", { name: messages.greetingName.save, exact: true }).click();
    await expect(form.getByRole("status")).toHaveText(messages.greetingName.saved);
    await form.getByRole("link", { name: messages.greetingName.viewHome }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages.authHome.heading.replace("{name}", fresh.fullName));
  }
  expect(await profile()).toEqual(before);
});

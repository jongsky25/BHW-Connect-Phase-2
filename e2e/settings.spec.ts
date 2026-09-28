import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  STABLE_BHW,
  createThrowawayBhw,
  getAccessToken,
  onboardThroughLogin,
} from "./fixtures/auth";

// A freshly onboarded BHW defaults to language='fil' (baseline migration),
// but the colour-picker assertions below are keyed to English labels (some
// of settings.coloursMainLabel/coloursAccentLabel etc. are translated, unlike
// the colourway/preset names themselves) — same reasoning as
// lesson-narration.spec.ts's onboardEnglishBhw. Set it via the RPC directly
// rather than the Settings page's own language switcher, which is its own
// round trip already covered by the "settings persist..." test above.
async function setLanguageEnglish(page: Page, userToken: string) {
  await page.request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_update_settings`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    data: { p_language: "en", p_theme: "light", p_font_scale: "md", p_high_contrast: false },
  });
}

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

// Increment 2.3 DoD: a signed-out visitor's display prefs come from the
// BHW_DISPLAY cookie and survive a reload. Set directly here (rather than
// through the header's quick-display popover, which increment 3.5 adds and
// exercises for real in the test below) to isolate the SSR read path.
test("a signed-out visitor's BHW_DISPLAY cookie applies on /login and survives reload", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");

  await page.context().addCookies([
    { name: "BHW_DISPLAY", value: JSON.stringify({ theme: "dark", font_scale: "lg" }), url: new URL(page.url()).origin },
  ]);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-font-scale", "lg");

  // A second reload proves this is the cookie being re-read on every
  // request, not a one-off from the navigation that just set it.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-font-scale", "lg");
});

test("a signed-in profile's settings override a leftover BHW_DISPLAY cookie", async ({ page }) => {
  await page.goto("/login");
  await page.context().addCookies([
    { name: "BHW_DISPLAY", value: JSON.stringify({ theme: "dark" }), url: new URL(page.url()).origin },
  ]);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();

  await expect(page).toHaveURL("/home", { timeout: 10_000 });
  // STABLE_BHW's own profile has no theme override, so the profile (not
  // the stale signed-out cookie) decides what renders once signed in.
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
});

// Increment 3.5 DoD.
test("picking the Equity in Health preset recolours the header and persists on reload", async ({ page, request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);
  const newPassword = "Fresh-Colours-2026";
  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, newPassword);

  const userToken = await getAccessToken(request, fresh.username, newPassword);
  await setLanguageEnglish(page, userToken);

  await page.goto("/settings");
  const main = page.getByRole("main");
  await main.getByRole("button", { name: "Equity in Health" }).click();

  await expect(page.locator("html")).toHaveAttribute("data-primary", "equity");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "marigold");
  await expect(main.getByText("Your settings have been saved.")).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-primary", "equity");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "marigold");

  const a11yScan = await new AxeBuilder({ page }).include("main").analyze();
  expect(a11yScan.violations).toEqual([]);
});

test("the main and accent colour swatches are keyboard-operable", async ({ page, request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);
  const newPassword = "Fresh-Swatch-2026";
  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, newPassword);

  const userToken = await getAccessToken(request, fresh.username, newPassword);
  await setLanguageEnglish(page, userToken);

  await page.goto("/settings");
  const main = page.getByRole("main");

  const mainColourRadio = main.getByRole("group", { name: "Main colour" }).getByRole("radio", { name: "Rose" });
  await mainColourRadio.focus();
  await page.keyboard.press("Space");
  await expect(mainColourRadio).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-primary", "rose");

  const accentColourRadio = main.getByRole("group", { name: "Accent colour" }).getByRole("radio", { name: "Violet" });
  await accentColourRadio.focus();
  await page.keyboard.press("Space");
  await expect(accentColourRadio).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "violet");
});

// Increment 4.5 DoD: the plan's own axe matrix — {light, dark} ×
// {standard, high contrast} × {marigold/teal, equity/marigold} — run against
// one throwaway profile rather than eight, since each combination only
// needs the settings page in that state, not a fresh account. Asserts the
// resulting <html> attribute(s) before each scan rather than waiting for
// the "saved" banner: re-clicking an already-selected radio (the first
// theme/contrast combination lands on the profile's own defaults) doesn't
// fire a change event in a real browser, so no save round-trip happens —
// the attribute, applied synchronously by useDisplaySettings.ts on click,
// is the reliable signal either way. Bayanihan (marigold/teal) is this
// profile's own default pair, so displayAttributes() omits data-primary/
// data-accent entirely for it — only Equity in Health's non-default pair
// sets them.
test("axe passes across theme × contrast × colourway combinations (4.5)", async ({ page, request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);
  const newPassword = "Fresh-AxeMatrix-2026";
  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, newPassword);
  const userToken = await getAccessToken(request, fresh.username, newPassword);
  await setLanguageEnglish(page, userToken);

  await page.goto("/settings");
  const main = page.getByRole("main");

  const themes = [
    { label: "Light", attr: "light" },
    { label: "Dark", attr: "dark" },
  ] as const;
  const contrasts = [
    { label: "Standard", attr: null },
    { label: "High", attr: "high" },
  ] as const;
  const colourways = [
    { preset: "Bayanihan", primary: null, accent: null },
    { preset: "Equity in Health", primary: "equity", accent: "marigold" },
  ] as const;

  for (const theme of themes) {
    await main.getByRole("radio", { name: theme.label }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme.attr);

    for (const contrast of contrasts) {
      await main.getByRole("radio", { name: contrast.label }).click();
      if (contrast.attr) {
        await expect(page.locator("html")).toHaveAttribute("data-contrast", contrast.attr);
      } else {
        await expect(page.locator("html")).not.toHaveAttribute("data-contrast", "high");
      }

      for (const colourway of colourways) {
        await main.getByRole("button", { name: colourway.preset }).click();
        if (colourway.primary) {
          await expect(page.locator("html")).toHaveAttribute("data-primary", colourway.primary);
          await expect(page.locator("html")).toHaveAttribute("data-accent", colourway.accent);
        } else {
          await expect(page.locator("html")).not.toHaveAttribute("data-primary");
          await expect(page.locator("html")).not.toHaveAttribute("data-accent");
        }

        const a11yScan = await new AxeBuilder({ page }).include("main").analyze();
        expect(
          a11yScan.violations,
          `theme=${theme.label} contrast=${contrast.label} colourway=${colourway.preset}`,
        ).toEqual([]);
      }
    }
  }
});

// Increment 4.5 DoD: the plan's own "320px width pass".
test("settings page passes axe at 320px width", async ({ page, request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);
  const newPassword = "Fresh-Axe320-2026";
  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, newPassword);
  const userToken = await getAccessToken(request, fresh.username, newPassword);
  await setLanguageEnglish(page, userToken);

  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/settings");

  const a11yScan = await new AxeBuilder({ page }).include("main").analyze();
  expect(a11yScan.violations).toEqual([]);
});

test("a signed-out visitor's quick-display popover writes the BHW_DISPLAY cookie and persists on reload", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");

  // /login renders in the default cookie-less locale (Filipino) — switch via
  // the header's own toggle, same as shell.spec.ts's language-toggle test,
  // so the popover's "Dark" radio has that exact English label.
  await page.getByRole("button", { name: "English" }).click();

  await page.getByRole("button", { name: "Display" }).click();
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // The popover applies instantly to <html> but only writes the BHW_DISPLAY
  // cookie after use-display-settings.ts's 600ms save debounce fires —
  // reloading before that lands would race it and lose the change, so wait
  // for the cookie itself rather than a fixed sleep.
  await page.waitForFunction(() => document.cookie.includes("BHW_DISPLAY="));

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

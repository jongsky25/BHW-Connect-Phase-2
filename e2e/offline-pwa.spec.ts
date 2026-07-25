import { expect, test } from "@playwright/test";
import { STABLE_ADMIN, getAccessToken } from "./fixtures/auth";

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  return url;
}

function anonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required");
  return key;
}

async function setOfflinePwaFlag(request: import("@playwright/test").APIRequestContext, enabled: boolean) {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const response = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_flag_toggle`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    data: { p_key: "offline_pwa", p_enabled: enabled },
  });
  expect(response.status(), await response.text()).toBe(204);
}

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });
}

// offline_pwa is a global, app-wide flag (not a single feature's nav
// link), so this test flips it on just long enough to assert the
// PWA surface appears, then always restores it off in `finally` — same
// discipline as INC-9's flag-toggle test, never leave shared e2e state
// mutated for other specs running in parallel.
test("offline_pwa on: manifest, theme-color, and the service worker register", async ({ page, request }) => {
  await setOfflinePwaFlag(request, true);
  try {
    await login(page);

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#b84e12");

    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    });
  } finally {
    await setOfflinePwaFlag(request, false);
  }
});

test("offline_pwa off: no manifest/theme-color, and an existing registration unregisters", async ({
  page,
  request,
}) => {
  // Register one first (flag on), then flip off and reload to exercise the
  // kill switch — flipping a flag off must not just stop *new*
  // registrations, it must tear down one a BHW already picked up.
  await setOfflinePwaFlag(request, true);
  await login(page);
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration()));

  await setOfflinePwaFlag(request, false);
  try {
    await page.reload();

    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(0);

    await page.waitForFunction(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length === 0;
    });
  } finally {
    await setOfflinePwaFlag(request, false);
  }
});

test("the offline fallback page is public and renders in Filipino by default", async ({ page }) => {
  await page.goto("/offline");

  await expect(page).toHaveURL("/offline");
  await expect(page.getByRole("heading", { name: "Offline ka" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Subukan muli" })).toBeVisible();
});

import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";

// Fixture accounts seeded on the dedicated `bhw-connect-e2e` Supabase
// project's org chain (Department of Health -> Region IV-A -> Laguna ->
// Los Baños -> barangay) — never the pilot project; see
// docs/deploy-runbook.md's "CI test project" section.
// bhw.stable / admin.stable are fully onboarded and never mutated by tests,
// so they're safe to reuse across runs. Tests that need a fresh account
// (forced password change, lockout) provision a throwaway user per run via
// rpc_admin_create_user instead of mutating a shared fixture.
//
// Passwords are intentionally NOT hardcoded here even though the project
// they belong to is test-only — set them locally in .env.local (gitignored)
// and as CI secrets; see .env.example.
export const BARANGAY_BATONG_MALAKE_ID = "00000000-0000-0000-0000-000000000005";
export const BARANGAY_ANOS_ID = "00000000-0000-0000-0000-000000000006";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const STABLE_BHW = {
  username: "bhw.stable",
  get password() {
    return requireEnv("E2E_STABLE_BHW_PASSWORD");
  },
};
export const STABLE_ADMIN = {
  username: "admin.stable",
  get password() {
    return requireEnv("E2E_STABLE_ADMIN_PASSWORD");
  },
};
export const OTHER_BARANGAY_BHW = {
  username: "bhw.other",
  get password() {
    return requireEnv("E2E_OTHER_BARANGAY_BHW_PASSWORD");
  },
};
// City-level (Los Baños) admin, parent of both pilot barangays — seeded by
// the INC-6 migration (unlike the other fixtures above, which were
// provisioned by hand on the pilot project) so the dashboard's org-unit
// roll-up scoping is testable in CI.
export const STABLE_CITY_ADMIN = {
  username: "admin.city.stable",
  get password() {
    return requireEnv("E2E_STABLE_CITY_ADMIN_PASSWORD");
  },
};

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required to run the auth E2E suite");
  }
  return url;
}

function anonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required to run the auth E2E suite");
  }
  return key;
}

export async function getAccessToken(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const response = await request.post(`${supabaseUrl()}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey(), "Content-Type": "application/json" },
    data: { email: `${username}@bhw.local`, password },
  });
  const body = (await response.json()) as { access_token?: string; error?: string };
  if (!body.access_token) {
    throw new Error(`Failed to sign in as ${username}: ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

export async function restGet(
  request: APIRequestContext,
  accessToken: string,
  path: string,
): Promise<unknown[]> {
  const response = await request.get(`${supabaseUrl()}/rest/v1/${path}`, {
    headers: { apikey: anonKey(), Authorization: `Bearer ${accessToken}` },
  });
  return (await response.json()) as unknown[];
}

async function createThrowawayUser(
  request: APIRequestContext,
  adminAccessToken: string,
  orgUnitId: string,
  role: "bhw" | "assessor",
): Promise<{ username: string; tempPassword: string; fullName: string }> {
  const username = `e2e.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const fullName = `E2E Throwaway ${username}`;

  const response = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_admin_create_user`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${adminAccessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      p_username: username,
      p_full_name: fullName,
      p_role: role,
      p_org_unit_id: orgUnitId,
    },
  });

  const rows = (await response.json()) as Array<{ user_id: string; temp_password: string }>;
  const row = rows[0];
  if (!row) {
    throw new Error(`Failed to provision throwaway ${role}: ${JSON.stringify(rows)}`);
  }

  return { username, tempPassword: row.temp_password, fullName };
}

export async function createThrowawayBhw(
  request: APIRequestContext,
  adminAccessToken: string,
  orgUnitId: string,
): Promise<{ username: string; tempPassword: string; fullName: string }> {
  return createThrowawayUser(request, adminAccessToken, orgUnitId, "bhw");
}

export async function createThrowawayAssessor(
  request: APIRequestContext,
  adminAccessToken: string,
  orgUnitId: string,
): Promise<{ username: string; tempPassword: string; fullName: string }> {
  return createThrowawayUser(request, adminAccessToken, orgUnitId, "assessor");
}

// Drives a freshly provisioned BHW through the forced change-password and
// consent screens (INC-1) so tests that only care about what comes after
// (settings, onboarding, ...) don't have to repeat this every time.
export async function onboardThroughLogin(
  page: Page,
  username: string,
  tempPassword: string,
  newPassword: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(tempPassword);
  await page.getByRole("button", { name: "Mag-login" }).click();

  await expect(page).toHaveURL("/change-password", { timeout: 10_000 });
  await page.getByLabel("Bagong password", { exact: true }).fill(newPassword);
  await page.getByLabel("Kumpirmahin ang bagong password").fill(newPassword);
  await page.getByRole("button", { name: "I-save ang password" }).click();

  await expect(page).toHaveURL("/consent", { timeout: 10_000 });
  await page.getByRole("button", { name: "Sumasang-ayon ako" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });
}

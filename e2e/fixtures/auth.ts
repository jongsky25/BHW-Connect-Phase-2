import type { APIRequestContext } from "@playwright/test";

// Fixture accounts seeded on the pilot Supabase project's org chain
// (Department of Health -> Region IV-A -> Laguna -> Los Baños -> barangay).
// bhw.stable / admin.stable are fully onboarded and never mutated by tests,
// so they're safe to reuse across runs. Tests that need a fresh account
// (forced password change, lockout) provision a throwaway user per run via
// rpc_admin_create_user instead of mutating a shared fixture.
//
// Passwords are intentionally NOT hardcoded here — they're real credentials
// on the live pilot project. Set them locally in .env.local (gitignored)
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

export async function createThrowawayBhw(
  request: APIRequestContext,
  adminAccessToken: string,
  orgUnitId: string,
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
      p_role: "bhw",
      p_org_unit_id: orgUnitId,
    },
  });

  const rows = (await response.json()) as Array<{ user_id: string; temp_password: string }>;
  const row = rows[0];
  if (!row) {
    throw new Error(`Failed to provision throwaway BHW: ${JSON.stringify(rows)}`);
  }

  return { username, tempPassword: row.temp_password, fullName };
}

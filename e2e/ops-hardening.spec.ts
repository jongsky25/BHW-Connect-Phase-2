import { expect, test } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  createThrowawayBhw,
  getAccessToken,
} from "./fixtures/auth";

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

async function callRpc(
  request: import("@playwright/test").APIRequestContext,
  accessToken: string,
  fn: string,
  body: Record<string, unknown>,
) {
  const response = await request.post(`${supabaseUrl()}/rest/v1/rpc/${fn}`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: body,
  });
  // Functions declared `returns void` (rpc_flag_toggle,
  // rpc_admin_anonymize_user) get a 204 No Content from PostgREST with no
  // body at all — parsing that as JSON throws, so only parse when there's
  // actually content to parse.
  const text = await response.text();
  return { status: response.status(), body: text.length > 0 ? JSON.parse(text) : null };
}

// INC-9 DoD: "a flag flip hides a feature without deploy." kb_articles is a
// global flag shared with every other e2e spec/live traffic, so this test
// flips it off just long enough to assert the nav link disappears, then
// always restores it in `finally` — never leave a shared flag mutated.
test("flipping a feature flag off hides its nav link immediately", async ({ page, request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/users");
  await expect(page.getByRole("link", { name: /Articles|Artikulo/ })).toBeVisible();

  try {
    const off = await callRpc(request, adminToken, "rpc_flag_toggle", {
      p_key: "kb_articles",
      p_enabled: false,
    });
    expect(off.status).toBe(204);

    await page.reload();
    await expect(page.getByRole("link", { name: /Articles|Artikulo/ })).not.toBeVisible();

    await page.goto("/admin/kb/articles");
    await expect(page).toHaveURL("/admin/kb/categories", { timeout: 10_000 });
  } finally {
    const on = await callRpc(request, adminToken, "rpc_flag_toggle", {
      p_key: "kb_articles",
      p_enabled: true,
    });
    expect(on.status).toBe(204);
  }

  await page.reload();
  await expect(page.getByRole("link", { name: /Articles|Artikulo/ })).toBeVisible();
});

// INC-9 DoD (§5.4 DPA data-subject rights): export returns the user's data;
// anonymize deactivates the account and scrubs PII.
test("admin can export and then anonymize a BHW's data", async ({ request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  // The throwaway helper only returns username/tempPassword/fullName, not
  // the row id — look it up via the users REST endpoint first.
  const lookup = await request.get(
    `${supabaseUrl()}/rest/v1/users?username=eq.${fresh.username}&select=id`,
    { headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}` } },
  );
  const [{ id: userId }] = (await lookup.json()) as Array<{ id: string }>;

  const exported = await callRpc(request, adminToken, "rpc_admin_export_user_data", {
    p_user_id: userId,
  });
  expect(exported.status).toBe(200);
  expect(exported.body).toMatchObject({ profile: { username: fresh.username } });

  const anonymized = await callRpc(request, adminToken, "rpc_admin_anonymize_user", {
    p_user_id: userId,
  });
  expect(anonymized.status).toBe(204);

  const after = await request.get(`${supabaseUrl()}/rest/v1/users?id=eq.${userId}&select=username,status,full_name`, {
    headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}` },
  });
  const [row] = (await after.json()) as Array<{ username: string; status: string; full_name: string }>;
  expect(row.status).toBe("deactivated");
  expect(row.username).toMatch(/^anonymized-/);
  expect(row.full_name).toBe("Anonymized User");
});

// INC-9 DoD: "purge job dry-run verified." Dry run must never delete rows —
// re-running it twice should report identical (non-negative) counts.
test("retention purge dry run reports counts without deleting anything", async ({ request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);

  const first = await callRpc(request, adminToken, "rpc_retention_purge", { p_dry_run: true });
  const second = await callRpc(request, adminToken, "rpc_retention_purge", { p_dry_run: true });

  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  expect(first.body).toEqual(second.body);

  const [row] = first.body as Array<Record<string, number>>;
  for (const value of Object.values(row)) {
    expect(value).toBeGreaterThanOrEqual(0);
  }
});

// Issue #58 follow-up: rpc_e2e_purge_test_users dry run must never delete
// anything either — same double-dry-run-matches shape as the retention
// purge test above. Never exercises p_dry_run: false here: this suite's
// own throwaway fixtures (including the one created above) are well
// under the RPC's 24h cutoff, but a live run is destructive on shared
// infrastructure and belongs in the scheduled workflow, not the smoke
// suite.
test("e2e test user purge dry run reports a count without deleting anything", async ({ request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);

  const first = await callRpc(request, adminToken, "rpc_e2e_purge_test_users", { p_dry_run: true });
  const second = await callRpc(request, adminToken, "rpc_e2e_purge_test_users", { p_dry_run: true });

  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  expect(first.body).toEqual(second.body);

  const [row] = first.body as Array<{ users_purged: number }>;
  expect(row.users_purged).toBeGreaterThanOrEqual(0);
});

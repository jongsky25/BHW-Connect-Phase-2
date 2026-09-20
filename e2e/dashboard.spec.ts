import { expect, test } from "@playwright/test";
import {
  BARANGAY_ANOS_ID,
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  STABLE_CITY_ADMIN,
  createThrowawayBhw,
  getAccessToken,
  restGet,
} from "./fixtures/auth";

function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL as string;
}

function anonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
}

async function logChatSession(
  request: import("@playwright/test").APIRequestContext,
  accessToken: string,
  userId: string,
) {
  const sessionResponse = await request.post(`${supabaseUrl()}/rest/v1/chat_sessions`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data: { user_id: userId },
  });
  const [session] = (await sessionResponse.json()) as Array<{ id: string }>;

  await request.post(`${supabaseUrl()}/rest/v1/chat_messages`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: { session_id: session.id, sender: "user", text: "e2e dashboard fixture question" },
  });
}

// INC-6 DoD, first half: an unmatched question moves through triage —
// gap queue -> "Create KB entry from this" pre-fill -> publish -> the
// question is now answered in chat and the gap is marked resolved.
test("admin triages an unmatched question into a published entry from the dashboard, closing the gap", async ({
  page,
  request,
}) => {
  // Two full login/onboarding flows plus two chat round trips plus the
  // full KB-authoring flow, all against the live remote pilot project —
  // every step here is a real network round trip, not a local mock, so
  // this genuinely needs more than Playwright's 30s default.
  test.setTimeout(60_000);

  // The nonsense question becomes a real, permanently published KB entry
  // (via the "create from unmatched" prefill flow) on the shared live
  // pilot project — every token must be unique to this run. Reusing
  // static "gibberish" words (e.g. "asdf", "nonsense") across CI runs
  // would let published entries from earlier runs accumulate shared
  // keyword/trigram overlap and start scoring as real matches for later
  // runs' "nonsense" questions, breaking the no-answer assertion below.
  const marker = `dash${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const nonsenseQuestion = `${marker} ${Math.random().toString(36).slice(2, 10)} ${Math.random().toString(36).slice(2, 10)}`;

  // A throwaway BHW, not bhw.stable: chat-guide.spec.ts's rate-limit test
  // deliberately floods bhw.stable's /api/chat budget (25 requests against
  // the 20/60s sliding window), and that test runs immediately before this
  // one in the suite. Sharing the account would make this test's chat
  // requests collide with that still-open rate-limit window.
  const adminSetupToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const bhw = await createThrowawayBhw(request, adminSetupToken, BARANGAY_BATONG_MALAKE_ID);

  await page.goto("/login");
  await page.getByLabel("Username").fill(bhw.username);
  await page.getByLabel("Password").fill(bhw.tempPassword);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/change-password", { timeout: 10_000 });

  await page.getByLabel("Bagong password", { exact: true }).fill("Dashboard-E2e-2026");
  await page.getByLabel("Kumpirmahin ang bagong password").fill("Dashboard-E2e-2026");
  await page.getByRole("button", { name: "I-save ang password" }).click();
  await expect(page).toHaveURL("/consent", { timeout: 10_000 });

  await page.getByRole("button", { name: "Sumasang-ayon ako" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/chat");
  const input = page.getByLabel("Ang iyong tanong");
  await input.fill(nonsenseQuestion);
  await Promise.all([page.waitForResponse((r) => r.url().includes("/api/chat")), input.press("Enter")]);
  await expect(page.getByText("Wala pa akong sagot diyan.", { exact: false })).toBeVisible({
    timeout: 10_000,
  });

  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });

  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/dashboard/chat-guide");
  const gapRow = page.getByRole("row", { name: new RegExp(marker) });
  await expect(gapRow).toBeVisible();

  await gapRow.getByRole("link", { name: "Gumawa ng KB Entry Mula Rito" }).click();
  await expect(page).toHaveURL(/\/admin\/kb\/entries\/new\?fromUnmatched=/, { timeout: 10_000 });
  await expect(page.getByText(nonsenseQuestion, { exact: false })).toBeVisible();

  const answerFil = `Sagot para sa ${marker}.`;
  const answerEn = `Answer for ${marker}.`;
  await page.getByLabel("Sagot (Filipino)").fill(answerFil);
  await page.getByLabel("Sagot (English)").fill(answerEn);
  await page.getByLabel("Mga Keyword").fill(marker);
  await page.getByLabel("May-ari").selectOption({ index: 1 });

  const [createResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("rpc_kb_entry_create")),
    page.getByRole("button", { name: "Ilathala" }).click(),
  ]);
  const createBody = (await createResponse.json()) as Array<{ entry_id: string }>;
  const entryId = createBody[0]?.entry_id;
  expect(entryId).toBeTruthy();

  await expect(page).toHaveURL("/admin/kb/entries", { timeout: 10_000 });
  await expect(page.getByRole("row", { name: new RegExp(marker) }).getByText("Nailathala")).toBeVisible();

  await page.goto("/admin/dashboard/chat-guide");
  await expect(page.getByRole("row", { name: new RegExp(marker) })).toHaveCount(0);

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const gapRows = (await restGet(
    request,
    adminToken,
    `unmatched_questions?text=eq.${encodeURIComponent(nonsenseQuestion)}&select=status,resolved_entry_id`,
  )) as Array<{ status: string; resolved_entry_id: string }>;
  expect(gapRows).toHaveLength(1);
  expect(gapRows[0]?.status).toBe("resolved");
  expect(gapRows[0]?.resolved_entry_id).toBe(entryId);

  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });

  await page.getByLabel("Username").fill(bhw.username);
  await page.getByLabel("Password").fill("Dashboard-E2e-2026");
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/chat");
  await page.getByLabel("Ang iyong tanong").fill(nonsenseQuestion);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/chat")),
    page.getByLabel("Ang iyong tanong").press("Enter"),
  ]);
  await expect(page.getByText(answerFil)).toBeVisible({ timeout: 10_000 });
});

// INC-6 DoD, second half: a barangay admin sees only their own scope on the
// dashboard; a higher-level (city) admin sees the roll-up across barangays.
test("dashboard Activity tab scopes BHWs by org unit, with roll-up for a higher-level admin", async ({
  page,
  request,
}) => {
  const cityAdminToken = await getAccessToken(request, STABLE_CITY_ADMIN.username, STABLE_CITY_ADMIN.password);

  const batongMalakeBhw = await createThrowawayBhw(request, cityAdminToken, BARANGAY_BATONG_MALAKE_ID);
  const anosBhw = await createThrowawayBhw(request, cityAdminToken, BARANGAY_ANOS_ID);

  const batongMalakeToken = await getAccessToken(request, batongMalakeBhw.username, batongMalakeBhw.tempPassword);
  const anosToken = await getAccessToken(request, anosBhw.username, anosBhw.tempPassword);

  const batongMalakeRows = (await restGet(
    request,
    cityAdminToken,
    `users?username=eq.${batongMalakeBhw.username}&select=id`,
  )) as Array<{ id: string }>;
  const anosRows = (await restGet(
    request,
    cityAdminToken,
    `users?username=eq.${anosBhw.username}&select=id`,
  )) as Array<{ id: string }>;

  await logChatSession(request, batongMalakeToken, batongMalakeRows[0].id);
  await logChatSession(request, anosToken, anosRows[0].id);

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  // INC-58: the Activity table is paginated, so a freshly created BHW
  // among however many already exist in this shared project's org unit
  // is not reliably on page 1 — search for it by its (unique) username
  // instead of relying on page position.
  await page.goto("/admin/dashboard");
  await page.getByLabel("Maghanap ayon sa pangalan o username").fill(batongMalakeBhw.username);
  await page.getByLabel("Maghanap ayon sa pangalan o username").press("Enter");
  await expect(page.getByRole("row", { name: new RegExp(batongMalakeBhw.username) })).toBeVisible();

  await page.getByLabel("Maghanap ayon sa pangalan o username").fill(anosBhw.username);
  await page.getByLabel("Maghanap ayon sa pangalan o username").press("Enter");
  await expect(page.getByRole("row", { name: new RegExp(anosBhw.username) })).toHaveCount(0);

  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });

  await page.getByLabel("Username").fill(STABLE_CITY_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_CITY_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/dashboard");
  await page.getByLabel("Maghanap ayon sa pangalan o username").fill(batongMalakeBhw.username);
  await page.getByLabel("Maghanap ayon sa pangalan o username").press("Enter");
  await expect(page.getByRole("row", { name: new RegExp(batongMalakeBhw.username) })).toBeVisible();

  await page.getByLabel("Maghanap ayon sa pangalan o username").fill(anosBhw.username);
  await page.getByLabel("Maghanap ayon sa pangalan o username").press("Enter");
  await expect(page.getByRole("row", { name: new RegExp(anosBhw.username) })).toBeVisible();
});

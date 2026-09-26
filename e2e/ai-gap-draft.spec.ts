import { expect, test } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
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

// INC-18b DoD: the flywheel round trip, end to end and asserted.
//
//   a BHW asks something the KB cannot answer -> the admin clears it ->
//   the AI drafts an entry -> the admin reviews and publishes ->
//   the SAME question is answered from the KB, with NO further AI call.
//
// The last clause is the whole increment. Without asserting that ai_usage did
// not move on the second ask, this would only prove "AI writes drafts", not
// "the KB grows and the LLM is needed less" — which is the thing the
// maintainer actually asked for.
//
// Runs only when the feature is switched on and a provider key is configured.
// GEMINI_API_KEY lives in Vercel, not in CI, so this skips rather than fails in
// an environment that was never meant to spend quota.
async function flywheelConfigured(
  request: import("@playwright/test").APIRequestContext,
  adminToken: string,
): Promise<boolean> {
  const flags = (await restGet(
    request,
    adminToken,
    "feature_flags?key=in.(ai_external,ai_gap_draft)&select=key,enabled",
  )) as Array<{ key: string; enabled: boolean }>;

  return flags.length === 2 && flags.every((flag) => flag.enabled);
}

async function gapDraftCallCount(
  request: import("@playwright/test").APIRequestContext,
  adminToken: string,
): Promise<number> {
  // ai_usage has zero RLS policies by design, so it is unreadable directly —
  // the flywheel RPC is the only way in, which is exactly the constraint the
  // panel lives under too.
  const response = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_dashboard_ai_flywheel`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    data: {
      p_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      p_end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  const rows = (await response.json()) as Array<{ gap_draft_calls: number }>;
  return rows[0]?.gap_draft_calls ?? 0;
}

test("an AI draft becomes a published KB entry, and the next ask is answered with no AI call", async ({
  page,
  request,
}) => {
  // A BHW round trip, an external provider call, the full KB authoring flow and
  // a second BHW round trip, all against live remote services.
  test.setTimeout(90_000);

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);

  test.skip(
    !(await flywheelConfigured(request, adminToken)),
    "ai_external and ai_gap_draft must both be on, with GEMINI_API_KEY configured on the deployment",
  );

  // Same per-run marker discipline as dashboard.spec.ts: this question becomes
  // a permanently published entry on a shared project, so a static token would
  // let earlier runs' entries start matching later runs' "nonsense".
  const marker = `fly${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const question = `${marker} ano ang gagawin kung mataas ang presyon ng dugo`;

  const bhw = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  await page.goto("/login");
  await page.getByLabel("Username").fill(bhw.username);
  await page.getByLabel("Password").fill(bhw.tempPassword);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/change-password", { timeout: 10_000 });

  await page.getByLabel("Bagong password", { exact: true }).fill("Flywheel-E2e-2026");
  await page.getByLabel("Kumpirmahin ang bagong password").fill("Flywheel-E2e-2026");
  await page.getByRole("button", { name: "I-save ang password" }).click();
  await expect(page).toHaveURL("/consent", { timeout: 10_000 });

  await page.getByRole("button", { name: "Sumasang-ayon ako" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  // 1. The gap.
  await page.goto("/chat");
  const input = page.getByLabel("Ang iyong tanong");
  await input.fill(question);
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

  const callsBeforeDraft = await gapDraftCallCount(request, adminToken);

  // 2. Clearance and the draft.
  await page.goto(`/admin/dashboard/chat-guide?q=${encodeURIComponent(marker)}`);
  const gapRow = page.getByRole("row", { name: new RegExp(marker) });
  await expect(gapRow).toBeVisible();

  // The existing manual link must still be here and still be a link — its
  // locator in dashboard.spec.ts is substring + case-insensitive, so this is
  // the canary for a new control whose label overlaps it.
  await expect(gapRow.getByRole("link", { name: "Gumawa ng KB Entry Mula Rito" })).toBeVisible();

  await gapRow.getByRole("button", { name: "I-draft gamit ang AI" }).click();

  const clearedText = `Ano ang gagawin kung mataas ang presyon ng dugo ng kliyente? (${marker})`;
  await page.getByLabel("Tanong na ipapadala").fill(clearedText);

  const [draftResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/admin/gap/draft")),
    page.getByRole("button", { name: "Ipadala at i-draft" }).click(),
  ]);
  expect(draftResponse.status()).toBe(200);
  const { entry_id: entryId } = (await draftResponse.json()) as { entry_id: string };
  expect(entryId).toBeTruthy();

  await expect(page).toHaveURL(new RegExp(`/admin/kb/entries/${entryId}`), { timeout: 10_000 });
  expect(await gapDraftCallCount(request, adminToken)).toBe(callsBeforeDraft + 1);

  // 3. The review gate. Publish stays disabled until the admin ticks the box.
  await expect(page.getByText("AI draft", { exact: false })).toBeVisible();
  const publish = page.getByRole("button", { name: "Ilathala" });
  await expect(publish).toBeDisabled();

  await page.getByRole("checkbox").check();
  await expect(publish).toBeEnabled();

  // The AI's own keywords are left alone — replacing them here would test the
  // authoring form rather than the draft. The marker is appended so the second
  // ask below can only match this entry.
  const keywords = page.getByLabel("Mga Keyword");
  await keywords.fill(`${await keywords.inputValue()}, ${marker}`);
  await page.getByLabel("May-ari").selectOption({ index: 1 });

  await publish.click();
  await expect(page).toHaveURL("/admin/kb/entries", { timeout: 10_000 });

  const entryRows = (await restGet(
    request,
    adminToken,
    `kb_entries?id=eq.${entryId}&select=status,ai_drafted_at,ai_draft_confirmed_at`,
  )) as Array<{ status: string; ai_drafted_at: string | null; ai_draft_confirmed_at: string | null }>;
  expect(entryRows[0]?.status).toBe("published");
  expect(entryRows[0]?.ai_drafted_at).not.toBeNull();
  expect(entryRows[0]?.ai_draft_confirmed_at).not.toBeNull();

  // The gap closed with no new plumbing: rpc_kb_entry_create stamped
  // resolved_entry_id on the draft, rpc_kb_entry_update resolved it on publish.
  const gapRows = (await restGet(
    request,
    adminToken,
    `unmatched_questions?text=eq.${encodeURIComponent(question)}&select=status,resolved_entry_id`,
  )) as Array<{ status: string; resolved_entry_id: string }>;
  expect(gapRows[0]?.status).toBe("resolved");
  expect(gapRows[0]?.resolved_entry_id).toBe(entryId);

  // 4. The flywheel, asserted. The same question, answered from the KB.
  const callsBeforeSecondAsk = await gapDraftCallCount(request, adminToken);

  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });

  await page.getByLabel("Username").fill(bhw.username);
  await page.getByLabel("Password").fill("Flywheel-E2e-2026");
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/chat");
  const secondInput = page.getByLabel("Ang iyong tanong");
  await secondInput.fill(question);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/chat")),
    secondInput.press("Enter"),
  ]);
  await expect(page.getByText("Wala pa akong sagot diyan.", { exact: false })).toHaveCount(0);

  // The assertion the increment exists for: the answer came from the KB, and
  // the quota did not move.
  expect(await gapDraftCallCount(request, adminToken)).toBe(callsBeforeSecondAsk);
});

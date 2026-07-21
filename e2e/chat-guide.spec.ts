import { expect, test } from "@playwright/test";
import { STABLE_ADMIN, STABLE_BHW, getAccessToken, restGet } from "./fixtures/auth";

// INC-4 ships the matcher as a server route with no chat UI yet (that's
// INC-5), so this drives /api/chat directly via page.request — it shares
// the logged-in browser context's session cookies, which the route needs
// since it authenticates through @/lib/supabase/server's cookie session,
// not a bearer token.
test("Chat Guide API answers a published entry, dedupes unmatched questions, and rate-limits", async ({
  page,
  request,
}) => {
  const marker = `e2e.chat.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const questionEn = `What should I do about the ${marker} rash?`;
  const questionFil = `Ano ang gagawin ko sa ${marker} na pantal?`;

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const [category] = (await restGet(request, adminToken, "kb_categories?select=id&limit=1")) as Array<{
    id: string;
  }>;
  const [owner] = (await restGet(
    request,
    adminToken,
    `users?username=eq.${STABLE_ADMIN.username}&select=id`,
  )) as Array<{ id: string }>;

  const createResponse = await request.post(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_kb_entry_create`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      data: {
        p_category_id: category.id,
        p_question_fil: questionFil,
        p_question_en: questionEn,
        p_answer_fil: `Sagot para sa ${marker}.`,
        p_answer_en: `Answer for ${marker}.`,
        p_keywords: [marker],
        p_owner_user_id: owner.id,
        p_status: "published",
      },
    },
  );
  const [{ entry_id: entryId }] = (await createResponse.json()) as Array<{ entry_id: string }>;

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  const answerResponse = await page.request.post("/api/chat", { data: { question: questionEn } });
  expect(answerResponse.ok()).toBe(true);
  const answerBody = (await answerResponse.json()) as { type: string; answer?: { id: string } };
  expect(answerBody.type).toBe("answer");
  expect(answerBody.answer?.id).toBe(entryId);

  // Asking the same unanswerable question twice dedupes into one
  // unmatched_questions row with asked_count incremented, not two rows.
  const nonsenseQuestion = `zzz nonsense unmatched query ${marker}`;
  await page.request.post("/api/chat", { data: { question: nonsenseQuestion } });
  await page.request.post("/api/chat", { data: { question: nonsenseQuestion } });

  const unmatchedRows = (await restGet(
    request,
    adminToken,
    `unmatched_questions?text=eq.${encodeURIComponent(nonsenseQuestion)}&select=asked_count`,
  )) as Array<{ asked_count: number }>;
  expect(unmatchedRows).toHaveLength(1);
  expect(unmatchedRows[0]?.asked_count).toBe(2);

  // Hammering the endpoint past the per-user sliding window (default 20 /
  // 60s, rpc_chat_check_rate_limit) returns 429 with a Retry-After header.
  const floodResponses = await Promise.all(
    Array.from({ length: 25 }, (_, i) =>
      page.request.post("/api/chat", { data: { question: `rate limit probe ${i} ${marker}` } }),
    ),
  );
  const limited = floodResponses.find((r) => r.status() === 429);
  expect(limited).toBeDefined();
  expect(limited?.headers()["retry-after"]).toBeTruthy();
});

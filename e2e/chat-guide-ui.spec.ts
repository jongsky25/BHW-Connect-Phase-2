import { expect, test } from "@playwright/test";
import { STABLE_ADMIN, STABLE_BHW, getAccessToken, restGet } from "./fixtures/auth";

// INC-5 DoD: a BHW asks a Taglish question and gets the right entry; a
// nonsense question shows the graceful fallback and lands in the gap
// queue. The published entry's question/answer text uses a random
// single-token marker (no separators) as both a keyword and part of the
// question text, so the Taglish ask — deliberately reworded, not a
// literal copy — is guaranteed to score as a confident match regardless
// of whatever else is in the live corpus.
test("BHW asks a Taglish question in the Chat Guide UI and gets the published entry, and a nonsense question falls back gracefully into the gap queue", async ({
  page,
  request,
}) => {
  const marker = `zzz${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const questionEn = `What should I do about ${marker} fever?`;
  const questionFil = `Ano ang gagawin ko sa ${marker} na lagnat?`;
  const answerFil = `Bigyan ng tubig at dalhin sa health center kung tumagal ang ${marker}.`;
  const answerEn = `Give fluids and bring to the health center if the ${marker} lasts.`;

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const [category] = (await restGet(request, adminToken, "kb_categories?select=id&limit=1")) as Array<{
    id: string;
  }>;
  const [owner] = (await restGet(
    request,
    adminToken,
    `users?username=eq.${STABLE_ADMIN.username}&select=id`,
  )) as Array<{ id: string }>;

  await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_kb_entry_create`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    data: {
      p_category_id: category.id,
      p_question_fil: questionFil,
      p_question_en: questionEn,
      p_answer_fil: answerFil,
      p_answer_en: answerEn,
      p_keywords: [marker],
      p_owner_user_id: owner.id,
      p_status: "published",
    },
  });

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/chat");
  const input = page.getByLabel("Ang iyong tanong");
  await expect(input).toBeVisible();

  // Taglish phrasing, not a literal copy of question_fil/en — proves the
  // normalize -> synonym-expand -> score pipeline is doing real work, not
  // just exact-string matching.
  const taglishAsk = `meron akong ${marker} na lagnat, ano dapat gawin?`;
  await input.fill(taglishAsk);
  await Promise.all([page.waitForResponse((r) => r.url().includes("/api/chat")), input.press("Enter")]);

  await expect(page.getByText(answerFil)).toBeVisible({ timeout: 10_000 });

  // Feedback controls render for an answered question.
  await expect(page.getByRole("button", { name: "Nakatulong" })).toBeVisible();

  // A nonsense question falls back gracefully and lands in the gap queue.
  const gapMarker = `qzxjklw${Date.now().toString(36)}`;
  const nonsenseQuestion = `${gapMarker} asdf qwerty nonsense`;
  await input.fill(nonsenseQuestion);
  await Promise.all([page.waitForResponse((r) => r.url().includes("/api/chat")), input.press("Enter")]);

  await expect(page.getByText("Wala pa akong sagot diyan.", { exact: false })).toBeVisible({
    timeout: 10_000,
  });

  const unmatchedRows = (await restGet(
    request,
    adminToken,
    `unmatched_questions?text=eq.${encodeURIComponent(nonsenseQuestion)}&select=asked_count,reason`,
  )) as Array<{ asked_count: number; reason: string }>;
  expect(unmatchedRows).toHaveLength(1);
  expect(unmatchedRows[0]?.reason).toBe("no_answer");
});

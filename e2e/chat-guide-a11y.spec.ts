import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { STABLE_ADMIN, STABLE_BHW, getAccessToken, restGet } from "./fixtures/auth";

// INC-5 DoD: axe-core scan clean on the Chat Guide flow. Scans the empty
// state and, separately, the answer and no-answer response states — the
// two that are always reproducible against a fresh entry regardless of
// what else is in the live corpus. did_you_mean shares the same list/
// button markup as these two, so it isn't scanned as a separate case.
test("Chat Guide UI has no axe-core violations across its response states", async ({ page, request }) => {
  const marker = `e2e.a11y.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const questionEn = `What should I do about the ${marker} cough?`;
  const questionFil = `Ano ang gagawin ko sa ${marker} na ubo?`;

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
      p_answer_fil: `Sagot para sa ${marker}.`,
      p_answer_en: `Answer for ${marker}.`,
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
  await expect(page.getByLabel(/Ang iyong tanong|Your question/)).toBeVisible();

  const emptyStateScan = await new AxeBuilder({ page }).include("main").analyze();
  expect(emptyStateScan.violations).toEqual([]);

  const input = page.getByLabel(/Ang iyong tanong|Your question/);

  // Answer state (the freshly published entry above). The UI defaults to
  // the Filipino locale, so the rendered text is answer_fil unless the
  // locale is toggled — accept either since this test doesn't toggle it.
  await input.fill(questionEn);
  await Promise.all([page.waitForResponse((r) => r.url().includes("/api/chat")), input.press("Enter")]);
  await expect(
    page.getByText(new RegExp(`Sagot para sa ${marker}\\.|Answer for ${marker}\\.`)),
  ).toBeVisible({ timeout: 10_000 });
  const answerScan = await new AxeBuilder({ page }).include("main").analyze();
  expect(answerScan.violations).toEqual([]);

  // No-answer state.
  await input.fill(`zzz nonsense unmatched ${marker}`);
  await Promise.all([page.waitForResponse((r) => r.url().includes("/api/chat")), input.press("Enter")]);
  await expect(page.getByText(/Wala pa akong sagot diyan|I don't have an answer/)).toBeVisible({ timeout: 10_000 });
  const noAnswerScan = await new AxeBuilder({ page }).include("main").analyze();
  expect(noAnswerScan.violations).toEqual([]);
});

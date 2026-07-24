import { expect, test } from "@playwright/test";
import { STABLE_ADMIN, getAccessToken, restGet } from "./fixtures/auth";

// Covers the bulk-assign admin action added to unblock the INC-3
// "owner required to publish" rule across many seed-content drafts at
// once instead of opening each kb_entry individually.
test("admin bulk-assigns owner and review-due date across multiple draft KB entries", async ({
  page,
  request,
}) => {
  const marker = `e2e.bulk.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const [category] = (await restGet(request, adminToken, "kb_categories?select=id&limit=1")) as Array<{
    id: string;
  }>;
  const [owner] = (await restGet(
    request,
    adminToken,
    `users?username=eq.${STABLE_ADMIN.username}&select=id`,
  )) as Array<{ id: string }>;

  async function createDraftEntry(suffix: string): Promise<string> {
    const response = await request.post(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_kb_entry_create`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        data: {
          p_category_id: category.id,
          p_question_fil: `Tanong ${marker} ${suffix}`,
          p_question_en: `Question ${marker} ${suffix}`,
          p_answer_fil: `Sagot para sa ${marker} ${suffix}.`,
          p_answer_en: `Answer for ${marker} ${suffix}.`,
          p_keywords: [marker],
          p_status: "draft",
        },
      },
    );
    const [{ entry_id: entryId }] = (await response.json()) as Array<{ entry_id: string }>;
    return entryId;
  }

  // Two fresh drafts, neither with an owner — same state as the seed-content
  // backlog this action exists to clear.
  const entryIdA = await createDraftEntry("A");
  const entryIdB = await createDraftEntry("B");

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/kb/entries");

  const rowA = page.getByRole("row", { name: new RegExp(`Question ${marker} A`) });
  const rowB = page.getByRole("row", { name: new RegExp(`Question ${marker} B`) });
  await expect(rowA).toBeVisible();
  await expect(rowB).toBeVisible();
  await expect(rowA.getByText("Draft")).toBeVisible();
  await expect(rowB.getByText("Draft")).toBeVisible();

  await rowA.getByRole("checkbox").check();
  await rowB.getByRole("checkbox").check();
  await expect(page.getByText("2 ang napili")).toBeVisible();

  await page.getByLabel("May-ari").selectOption(owner.id);
  await page.getByLabel("Susunod na Review").fill("2027-01-01");

  const [assignResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("rpc_kb_entries_bulk_assign")),
    page.getByRole("button", { name: "Italaga ang may-ari + petsa ng review" }).click(),
  ]);
  const assignBody = (await assignResponse.json()) as Array<{ updated_count: number }>;
  expect(assignBody[0]?.updated_count).toBe(2);

  await expect(page.getByText("Na-update ang 2 na entry.")).toBeVisible();

  const updatedRows = (await restGet(
    request,
    adminToken,
    `kb_entries?id=in.(${entryIdA},${entryIdB})&select=owner_user_id,review_due_on`,
  )) as Array<{ owner_user_id: string; review_due_on: string }>;
  expect(updatedRows).toHaveLength(2);
  for (const row of updatedRows) {
    expect(row.owner_user_id).toBe(owner.id);
    expect(row.review_due_on).toBe("2027-01-01");
  }

  // The selection clears after a successful bulk assign, so re-checking the
  // now-owned rows and re-submitting without picking a different owner is a
  // no-op UI-side, not a hidden retry loop.
  await expect(page.getByText("0 ang napili")).toBeVisible();
});

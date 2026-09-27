import path from "node:path";
import { expect, test } from "@playwright/test";
import { STABLE_ADMIN, STABLE_BHW, getAccessToken, restGet, unpublishKbEntry } from "./fixtures/auth";

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

const TINY_PNG = path.join(__dirname, "fixtures", "tiny.png");

test("admin authors a bilingual Q&A entry with an image, publish is blocked without an owner, and it stays hidden from BHWs until published", async ({
  page,
  request,
}) => {
  const marker = `e2e.kb.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/kb/entries/new");

  await page.getByLabel("Tanong (Filipino)").fill(`Ilang beses dapat magpa-checkup? ${marker}`);
  await page.getByLabel("Tanong (English)").fill(`How many checkups are needed? ${marker}`);
  await page.getByLabel("Sagot (Filipino)").fill("Hindi bababa sa apat na beses.");
  await page.getByLabel("Sagot (English)").fill("At least four times.");
  await page.getByLabel("Mga Keyword").fill("checkup, prenatal");

  // Publishing without an owner must be blocked (DoD).
  await page.getByRole("button", { name: "Ilathala" }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText(
    "Kailangan ng may-ari bago mailathala ang entry na ito.",
  );
  await expect(page).toHaveURL("/admin/kb/entries/new");

  await page.getByLabel("May-ari").selectOption({ index: 1 });

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(TINY_PNG);
  // The uploaded preview <img> has alt="" (decorative), so it's stripped from
  // the accessibility tree — assert on the "remove image" button instead,
  // which only renders once the upload has set imageUrl.
  await expect(page.getByRole("button", { name: "Alisin ang larawan" })).toBeVisible({ timeout: 15_000 });

  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("rpc_kb_entry_create")),
    page.getByRole("button", { name: "Ilathala" }).click(),
  ]);
  const createBody = (await createResponse.json()) as Array<{ entry_id: string }>;
  const entryId = createBody[0]?.entry_id;
  expect(entryId).toBeTruthy();

  await expect(page).toHaveURL("/admin/kb/entries", { timeout: 10_000 });
  const row = page.getByRole("row", { name: new RegExp(marker) });
  await expect(row).toBeVisible();
  await expect(row.getByText("Nailathala")).toBeVisible();

  // A published entry is now readable by a BHW (RLS: status = 'published').
  const bhwToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
  const publishedRows = await restGet(request, bhwToken, `kb_entries?id=eq.${entryId}`);
  expect(publishedRows).toHaveLength(1);

  // Unpublishing (draft) makes it invisible to BHWs again.
  await row.getByRole("link", { name: "I-edit" }).click();
  await expect(page).toHaveURL(`/admin/kb/entries/${entryId}`);
  await page.getByRole("button", { name: "I-save bilang Draft" }).click();
  await expect(page).toHaveURL("/admin/kb/entries", { timeout: 10_000 });

  const draftRows = await restGet(request, bhwToken, `kb_entries?id=eq.${entryId}`);
  expect(draftRows).toHaveLength(0);
});

// RFT C3 DoD (docs/role-feature-toggles-plan.md §4.5): hide/show/archive/
// restore on a KB entry, driven through rpc_content_set_visibility exactly
// as the /admin/kb/entries console calls it. Only kb_entries feed the Chat
// Guide (kb_articles never do), so the "doesn't get cited" check belongs
// here rather than on an article. Always restored to draft in `finally`,
// the same discipline as the test above.
test("hiding, then archiving, a published KB entry takes it out of BHW reads and Chat Guide answers; showing/restoring brings it back", async ({
  page,
  request,
}) => {
  const marker = `e2e.kb.visibility.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const questionEn = `What is the ${marker} protocol?`;

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const [category] = (await restGet(request, adminToken, "kb_categories?select=id&limit=1")) as Array<{
    id: string;
  }>;
  const [owner] = (await restGet(
    request,
    adminToken,
    `users?username=eq.${STABLE_ADMIN.username}&select=id`,
  )) as Array<{ id: string }>;

  const createResponse = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_kb_entry_create`, {
    headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    data: {
      p_category_id: category.id,
      p_question_fil: `Ano ang protocol ng ${marker}?`,
      p_question_en: questionEn,
      p_answer_fil: `Sagot para sa ${marker}.`,
      p_answer_en: `Answer for ${marker}.`,
      p_keywords: [marker],
      p_owner_user_id: owner.id,
      p_status: "published",
    },
  });
  const [{ entry_id: entryId }] = (await createResponse.json()) as Array<{ entry_id: string }>;

  async function setVisibility(action: "hide" | "show" | "archive" | "restore") {
    const response = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_content_set_visibility`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: { p_type: "kb_entry", p_id: entryId, p_action: action },
    });
    expect(response.status(), `rpc_content_set_visibility(${action})`).toBe(204);
  }

  async function bhwCanReadEntry(): Promise<boolean> {
    const bhwToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
    const rows = await restGet(request, bhwToken, `kb_entries?id=eq.${entryId}`);
    return rows.length === 1;
  }

  // /api/chat authenticates through the signed-in page's own cookie session
  // (INC-4), not a bearer token, so this rides the same `page` the BHW
  // logged into above rather than a fresh request context.
  async function chatGuideCitesEntry(): Promise<boolean> {
    const response = await page.request.post("/api/chat", { data: { question: questionEn } });
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { type: string; answer?: { id: string } };
    return body.type === "answer" && body.answer?.id === entryId;
  }

  try {
    expect(await bhwCanReadEntry()).toBe(true);
    expect(await chatGuideCitesEntry()).toBe(true);

    await setVisibility("hide");
    expect(await bhwCanReadEntry()).toBe(false);
    expect(await chatGuideCitesEntry()).toBe(false);

    await setVisibility("show");
    expect(await bhwCanReadEntry()).toBe(true);
    expect(await chatGuideCitesEntry()).toBe(true);

    await setVisibility("archive");
    expect(await bhwCanReadEntry()).toBe(false);
    expect(await chatGuideCitesEntry()).toBe(false);
    // An archived entry can't be edited until it's restored.
    const editWhileArchived = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_kb_entry_update`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: {
        p_id: entryId,
        p_category_id: category.id,
        p_question_fil: `Ano ang protocol ng ${marker}?`,
        p_question_en: questionEn,
        p_answer_fil: `Sagot para sa ${marker}.`,
        p_answer_en: `Answer for ${marker}.`,
        p_keywords: [marker],
        p_owner_user_id: owner.id,
        p_review_due_on: null,
        p_status: "published",
      },
    });
    expect(editWhileArchived.status()).toBe(400);
    expect((await editWhileArchived.json())?.message).toBe("content archived");

    await setVisibility("restore");
    expect(await bhwCanReadEntry()).toBe(true);
    expect(await chatGuideCitesEntry()).toBe(true);
  } finally {
    await unpublishKbEntry(request, adminToken, entryId);
  }
});

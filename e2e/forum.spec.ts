import { expect, test } from "@playwright/test";
import { OTHER_BARANGAY_BHW, STABLE_ADMIN, STABLE_BHW, getAccessToken, restGet } from "./fixtures/auth";

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

test("an admin creates a category, a BHW starts a thread, a BHW in a different barangay replies, and an admin moderates the reply", async ({
  page,
  request,
}) => {
  const marker = `e2e.forum.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/forum");
  await page.getByLabel("Slug").fill(marker);
  await page.getByLabel("Pangalan (Filipino)").fill(`Kategorya ${marker}`);
  await page.getByLabel("Pangalan (English)").fill(`Category ${marker}`);

  const [createCategoryResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("rpc_forum_category_create")),
    page.getByRole("button", { name: "Gumawa ng kategorya" }).click(),
  ]);
  const createCategoryBody = (await createCategoryResponse.json()) as Array<{ category_id: string }>;
  const categoryId = createCategoryBody[0]?.category_id;
  expect(categoryId).toBeTruthy();

  // A BHW starts a thread in the new category.
  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/forum/new");
  await page.getByLabel("Kategorya").selectOption(categoryId);
  await page.getByLabel("Pamagat").fill(`Thread en ${marker}`);
  await page.getByLabel("Nilalaman").fill(`Body ${marker}`);
  await page.getByLabel("Mga Tag").fill("nutrition, vaccination");

  const [createThreadResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("rpc_forum_thread_create")),
    page.getByRole("button", { name: "I-post ang thread" }).click(),
  ]);
  const createThreadBody = (await createThreadResponse.json()) as Array<{ thread_id: string }>;
  const threadId = createThreadBody[0]?.thread_id;
  expect(threadId).toBeTruthy();

  await expect(page).toHaveURL(`/forum/${threadId}`, { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: `Thread en ${marker}` })).toBeVisible();

  // A BHW in a different barangay can see the thread (forum visibility is
  // global, not hierarchy-scoped) and replies to it.
  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });
  await page.getByLabel("Username").fill(OTHER_BARANGAY_BHW.username);
  await page.getByLabel("Password").fill(OTHER_BARANGAY_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto(`/forum/${threadId}`);
  await expect(page.getByRole("heading", { name: `Thread en ${marker}` })).toBeVisible();
  await page.getByLabel("Sumagot").fill(`Reply ${marker}`);
  await page.getByRole("button", { name: "I-post ang sagot" }).click();
  await expect(page.getByText(`Reply ${marker}`)).toBeVisible();

  const otherBarangayToken = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);
  const threadAuthorToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);

  // An admin hides the reply (post-first, moderate-after).
  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/forum");
  const postItem = page.getByRole("listitem").filter({ hasText: `Reply ${marker}` });
  await expect(postItem).toBeVisible();
  await postItem.getByRole("button", { name: "Itago" }).click();
  await expect(postItem.getByText("Nakatago")).toBeVisible();

  // The hidden reply no longer shows up for a third party (the thread's
  // own author, who didn't write this reply), but its own author can still
  // see it (so they know it was moderated).
  const filter = `forum_posts?body=eq.${encodeURIComponent(`Reply ${marker}`)}`;
  expect(await restGet(request, threadAuthorToken, filter)).toHaveLength(0);
  expect(await restGet(request, otherBarangayToken, filter)).toHaveLength(1);
});

// RFT C5 DoD (docs/role-feature-toggles-plan.md §7 C5): archive/restore on
// a thread, driven through rpc_content_set_visibility exactly as
// /admin/forum calls it. Only archive/restore apply here — hide/show stays
// INC-13 moderation (rpc_forum_thread_moderate), unaffected by this. A
// thread has no delete RPC, so this always ends archived rather than
// restored — out of every BHW's view, same spirit as the flipcharts and
// kb-authoring specs' cleanup.
test("archiving, then restoring, a forum thread takes it out of a BHW's reads without touching moderation", async ({
  request,
}) => {
  const marker = `e2e.forum.visibility.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const bhwToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
  const [category] = (await restGet(request, adminToken, "forum_categories?select=id&limit=1")) as Array<{
    id: string;
  }>;

  const createResponse = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_forum_thread_create`, {
    headers: { apikey: anonKey(), Authorization: `Bearer ${bhwToken}`, "Content-Type": "application/json" },
    data: {
      p_category_id: category.id,
      p_title: `Thread visibility ${marker}`,
      p_body: `Body ${marker}`,
      p_tags: [],
    },
  });
  const [{ thread_id: threadId }] = (await createResponse.json()) as Array<{ thread_id: string }>;

  async function setVisibility(action: "archive" | "restore") {
    const response = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_content_set_visibility`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: { p_type: "forum_thread", p_id: threadId, p_action: action },
    });
    expect(response.status(), `rpc_content_set_visibility(${action})`).toBe(204);
  }

  async function bhwCanReadThread(): Promise<boolean> {
    const rows = await restGet(request, bhwToken, `forum_threads?id=eq.${threadId}`);
    return rows.length === 1;
  }

  try {
    expect(await bhwCanReadThread()).toBe(true);

    await setVisibility("archive");
    expect(await bhwCanReadThread()).toBe(false);

    // Archiving never touches INC-13 moderation status: it stays "visible",
    // moderation's own field, unaffected by the archive.
    const [row] = (await restGet(request, adminToken, `forum_threads?id=eq.${threadId}&select=status`)) as Array<{
      status: string;
    }>;
    expect(row.status).toBe("visible");

    await setVisibility("restore");
    expect(await bhwCanReadThread()).toBe(true);
  } finally {
    // Best-effort: leaves the thread out of every BHW's view regardless of
    // which step above the test failed on (so it may already be archived).
    await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_content_set_visibility`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: { p_type: "forum_thread", p_id: threadId, p_action: "archive" },
    });
  }
});

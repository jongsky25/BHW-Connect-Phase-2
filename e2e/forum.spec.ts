import { expect, test } from "@playwright/test";
import { OTHER_BARANGAY_BHW, STABLE_ADMIN, STABLE_BHW, getAccessToken, restGet } from "./fixtures/auth";

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
  await expect(page.getByText(`Thread en ${marker}`)).toBeVisible();

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
  await expect(page.getByText(`Thread en ${marker}`)).toBeVisible();
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

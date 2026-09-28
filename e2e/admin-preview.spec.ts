import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  STABLE_SUPER_ADMIN,
  getAccessToken,
  restGet,
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
    headers: { apikey: anonKey(), Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    data: body,
  });
  const text = await response.text();
  return { status: response.status(), body: text.length > 0 ? JSON.parse(text) : null };
}

// RFT B2 DoD (docs/role-feature-toggles-plan.md §6 B2): "View as" preview
// matches what the previewed user type sees for the admin's own scope, and
// nothing can be saved while previewing. Every shared flag, flag-scoped
// role and content item this test touches is restored in `finally`, per
// §3 rule 3 — the pilot database is shared with every other e2e run and
// live traffic.
test("an admin previews as BHW: banner, nav, a disabled flag, a hidden article and a disabled survey submit — then exits", async ({
  page,
  request,
}) => {
  const marker = `e2e.preview.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const superAdminToken = await getAccessToken(request, STABLE_SUPER_ADMIN.username, STABLE_SUPER_ADMIN.password);
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  // Start "View as BHW" from the user menu.
  await page.getByRole("button", { name: /Naka-login bilang|Signed in as/ }).click();
  await page.getByRole("button", { name: "BHW" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  const banner = page.getByRole("status").filter({ hasText: "BHW" });
  await expect(banner).toBeVisible();

  const scan = await new AxeBuilder({ page }).include("main").analyze();
  expect(scan.violations, "axe violations while previewing").toEqual([]);

  // Admin is not in the nav while previewing (plan §4.4: /admin/* redirects,
  // and the previewed role's own nav renders instead of the admin's) — the
  // admin console link normally lives in the "More" menu, so open it to
  // make the absence check meaningful rather than trivially true.
  await page.getByRole("button", { name: "Higit pa" }).click();
  await expect(page.getByRole("link", { name: "Admin console" })).not.toBeVisible();
  await page.keyboard.press("Escape");

  let disabledForumForBhw = false;
  let hiddenArticleId: string | null = null;
  let createdSurveyId: string | null = null;

  try {
    // A flag disabled for BHW (by the super admin) is hidden from the
    // preview, even though the master switch stays on.
    const off = await callRpc(request, superAdminToken, "rpc_flag_set_role", {
      p_key: "forum",
      p_role: "bhw",
      p_enabled: false,
    });
    expect(off.status).toBe(204);
    disabledForumForBhw = true;

    await page.reload();
    await expect(page.getByRole("link", { name: "Forum" })).not.toBeVisible();

    // A hidden KB article (from C3) is not listed on the category page.
    const [category] = (await restGet(request, adminToken, "kb_categories?select=id,slug&limit=1")) as Array<{
      id: string;
      slug: string;
    }>;
    const [owner] = (await restGet(
      request,
      adminToken,
      `users?username=eq.${STABLE_ADMIN.username}&select=id`,
    )) as Array<{ id: string }>;
    const createArticle = await callRpc(request, adminToken, "rpc_kb_article_create", {
      p_category_id: category.id,
      p_title_fil: `Artikulo ${marker}`,
      p_title_en: `Article ${marker}`,
      p_body_fil: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: marker }] }] },
      p_body_en: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: marker }] }] },
      p_owner_user_id: owner.id,
      p_review_due_on: null,
      p_status: "published",
    });
    expect(createArticle.status).toBe(200);
    hiddenArticleId = (createArticle.body as Array<{ article_id: string }>)[0].article_id;

    const hide = await callRpc(request, adminToken, "rpc_content_set_visibility", {
      p_type: "kb_article",
      p_id: hiddenArticleId,
      p_action: "hide",
    });
    expect(hide.status).toBe(204);

    await page.goto(`/kb/${category.slug}`);
    await expect(page.getByText(marker)).not.toBeVisible();

    // The survey submit button is disabled while previewing.
    const createSurvey = await callRpc(request, adminToken, "rpc_survey_create", {
      p_org_unit_id: BARANGAY_BATONG_MALAKE_ID,
      p_title_fil: `Survey preview fil ${marker}`,
      p_title_en: `Survey preview en ${marker}`,
      p_description_fil: "",
      p_description_en: "",
      p_is_anonymous: false,
      p_questions: [{ type: "text", prompt_fil: "Puna", prompt_en: "Comment", options: [] }],
    });
    expect(createSurvey.status).toBe(200);
    createdSurveyId = (createSurvey.body as Array<{ survey_id: string }>)[0].survey_id;

    const publishSurvey = await callRpc(request, adminToken, "rpc_survey_set_status", {
      p_survey_id: createdSurveyId,
      p_status: "published",
    });
    expect(publishSurvey.status).toBe(204);

    await page.goto(`/surveys/${createdSurveyId}`);
    await expect(page.getByRole("button", { name: "Isumite" })).toBeDisabled();
  } finally {
    if (hiddenArticleId) {
      await callRpc(request, adminToken, "rpc_content_set_visibility", {
        p_type: "kb_article",
        p_id: hiddenArticleId,
        p_action: "show",
      });
      const [row] = (await restGet(
        request,
        adminToken,
        `kb_articles?id=eq.${hiddenArticleId}&select=id,category_id,title_fil,title_en,body_fil,body_en,owner_user_id,review_due_on`,
      )) as Array<Record<string, unknown>>;
      if (row) {
        await callRpc(request, adminToken, "rpc_kb_article_update", {
          p_id: row.id,
          p_category_id: row.category_id,
          p_title_fil: row.title_fil,
          p_title_en: row.title_en,
          p_body_fil: row.body_fil,
          p_body_en: row.body_en,
          p_owner_user_id: row.owner_user_id,
          p_review_due_on: row.review_due_on,
          p_status: "draft",
        });
      }
    }
    if (createdSurveyId) {
      await callRpc(request, adminToken, "rpc_survey_delete", { p_survey_id: createdSurveyId });
    }
    if (disabledForumForBhw) {
      const on = await callRpc(request, superAdminToken, "rpc_flag_set_role", {
        p_key: "forum",
        p_role: "bhw",
        p_enabled: true,
      });
      expect(on.status).toBe(204);
    }
  }

  // Exit preview returns to the admin dashboard.
  await page.getByRole("button", { name: "Itigil ang preview" }).click();
  await expect(page).toHaveURL("/admin/dashboard", { timeout: 10_000 });
  await expect(page.getByRole("status").filter({ hasText: "BHW" })).not.toBeVisible();
});

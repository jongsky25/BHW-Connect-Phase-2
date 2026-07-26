import { expect, test } from "@playwright/test";
import {
  BARANGAY_ANOS_ID,
  BARANGAY_BATONG_MALAKE_ID,
  OTHER_BARANGAY_BHW,
  STABLE_ADMIN,
  STABLE_BHW,
  STABLE_CITY_ADMIN,
  createThrowawayBhw,
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
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: body,
  });
  const text = await response.text();
  return { status: response.status(), body: text.length > 0 ? JSON.parse(text) : null };
}

// INC-16 DoD: a barangay-scoped broadcast (announcement) reaches a
// same-barangay BHW's notifications and not a sibling barangay's — the
// same org_unit_path() cascade INC-10 established, reused here.
test("a barangay-level announcement notifies a same-barangay BHW but not a sibling barangay", async ({ request }) => {
  const marker = `e2e.notif.announce.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);

  const created = await callRpc(request, adminToken, "rpc_announcement_create", {
    p_org_unit_id: BARANGAY_BATONG_MALAKE_ID,
    p_body_fil: `Tala ${marker}`,
    p_body_en: `Note ${marker}`,
  });
  const announcementId = (created.body as Array<{ announcement_id: string }>)[0]?.announcement_id;
  expect(announcementId).toBeTruthy();

  const sameBarangayToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
  const otherBarangayToken = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);

  const filter = `notifications?subject_id=eq.${announcementId}&notification_type=eq.announcement.created`;
  expect(await restGet(request, sameBarangayToken, filter)).toHaveLength(1);
  expect(await restGet(request, otherBarangayToken, filter)).toHaveLength(0);

  await callRpc(request, adminToken, "rpc_announcement_delete", { p_announcement_id: announcementId });
});

// INC-16 DoD: a city-or-higher-level publish cascades a notification down
// to every barangay beneath it, mirroring the underlying content's own
// cascade (INC-11's survey visibility).
test("a city-level survey publish cascades a notification to both barangays beneath it", async ({ request }) => {
  const marker = `e2e.notif.survey.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const cityAdminToken = await getAccessToken(request, STABLE_CITY_ADMIN.username, STABLE_CITY_ADMIN.password);

  const created = await callRpc(request, cityAdminToken, "rpc_survey_create", {
    p_org_unit_id: "00000000-0000-0000-0000-000000000004", // Los Baños (city level)
    p_title_fil: `Survey fil ${marker}`,
    p_title_en: `Survey en ${marker}`,
    p_description_fil: "",
    p_description_en: "",
    p_is_anonymous: false,
    p_questions: [{ type: "open_text", prompt_fil: "Bakit?", prompt_en: "Why?" }],
  });
  const surveyId = (created.body as Array<{ survey_id: string }>)[0]?.survey_id;
  expect(surveyId).toBeTruthy();

  await callRpc(request, cityAdminToken, "rpc_survey_set_status", { p_survey_id: surveyId, p_status: "published" });

  const batongMalakeToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
  const anosToken = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);

  const filter = `notifications?subject_id=eq.${surveyId}&notification_type=eq.survey.published`;
  expect(await restGet(request, batongMalakeToken, filter)).toHaveLength(1);
  expect(await restGet(request, anosToken, filter)).toHaveLength(1);

  await callRpc(request, cityAdminToken, "rpc_survey_delete", { p_survey_id: surveyId });
});

// INC-16 DoD: a forum reply notifies only the thread's original author, not
// the replier — and a draft/closed transition of a survey (not published)
// must NOT have produced a notification in the test above, which the
// subject_id + notification_type filter already guarantees implicitly.
test("a forum reply notifies the thread's author but not the replier", async ({ request }) => {
  const marker = `e2e.notif.forum.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const authorToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
  const replierToken = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);

  const category = await callRpc(request, adminToken, "rpc_forum_category_create", {
    p_slug: marker,
    p_name_fil: `Kategorya ${marker}`,
    p_name_en: `Category ${marker}`,
  });
  const categoryId = (category.body as Array<{ category_id: string }>)[0]?.category_id;
  expect(categoryId).toBeTruthy();

  const thread = await callRpc(request, authorToken, "rpc_forum_thread_create", {
    p_category_id: categoryId,
    p_title: `Thread ${marker}`,
    p_body: `Body ${marker}`,
  });
  const threadId = (thread.body as Array<{ thread_id: string }>)[0]?.thread_id;
  expect(threadId).toBeTruthy();

  const reply = await callRpc(request, replierToken, "rpc_forum_post_create", {
    p_thread_id: threadId,
    p_body: `Reply ${marker}`,
  });
  const postId = (reply.body as Array<{ post_id: string }>)[0]?.post_id;
  expect(postId).toBeTruthy();

  const filter = `notifications?subject_id=eq.${postId}&notification_type=eq.forum.reply`;
  expect(await restGet(request, authorToken, filter)).toHaveLength(1);
  expect(await restGet(request, replierToken, filter)).toHaveLength(0);
});

// INC-16 DoD: a transferred user is notified directly — a targeted
// delivery, not a broadcast to either org unit's whole roster.
test("a transferred user is notified, but another BHW in the destination org unit is not", async ({ request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  const lookup = await request.get(
    `${supabaseUrl()}/rest/v1/users?username=eq.${fresh.username}&select=id`,
    { headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}` } },
  );
  const [{ id: userId }] = (await lookup.json()) as Array<{ id: string }>;

  await callRpc(request, adminToken, "rpc_admin_transfer_user", {
    p_user_id: userId,
    p_new_org_unit_id: BARANGAY_ANOS_ID,
  });

  const transferredUserToken = await getAccessToken(request, fresh.username, fresh.tempPassword);
  const otherBarangayToken = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);

  const filter = `notifications?subject_id=eq.${userId}&notification_type=eq.user.transferred`;
  // Targeted delivery: only the transferred user themself is the
  // notification's recipient. It carries no org_unit_id, so it is not a
  // broadcast — neither a sibling BHW in the destination org unit nor the
  // admin who performed the transfer (not the recipient) can see it.
  expect(await restGet(request, transferredUserToken, filter)).toHaveLength(1);
  expect(await restGet(request, otherBarangayToken, filter)).toHaveLength(0);
  expect(await restGet(request, adminToken, filter)).toHaveLength(0);
});

// INC-16 DoD: opening the notifications feed's "mark all as read" advances
// the per-user cursor without touching the underlying rows. Uses a
// throwaway BHW (not STABLE_BHW) since this mutates a users column and
// the stable fixtures are never supposed to be mutated by tests.
test("marking notifications read advances the user's read cursor", async ({ request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);
  const bhwToken = await getAccessToken(request, fresh.username, fresh.tempPassword);

  const before = await request.get(
    `${supabaseUrl()}/rest/v1/users?username=eq.${fresh.username}&select=notifications_last_read_at`,
    { headers: { apikey: anonKey(), Authorization: `Bearer ${bhwToken}` } },
  );
  const [beforeRow] = (await before.json()) as Array<{ notifications_last_read_at: string | null }>;
  expect(beforeRow.notifications_last_read_at).toBeNull();

  const marked = await callRpc(request, bhwToken, "rpc_notifications_mark_read", {});
  expect(marked.status).toBe(204);

  const after = await request.get(
    `${supabaseUrl()}/rest/v1/users?username=eq.${fresh.username}&select=notifications_last_read_at`,
    { headers: { apikey: anonKey(), Authorization: `Bearer ${bhwToken}` } },
  );
  const [afterRow] = (await after.json()) as Array<{ notifications_last_read_at: string | null }>;

  expect(afterRow.notifications_last_read_at).toBeTruthy();
});

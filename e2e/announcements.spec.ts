import { expect, test } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  OTHER_BARANGAY_BHW,
  STABLE_ADMIN,
  STABLE_BHW,
  STABLE_CITY_ADMIN,
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

test("a barangay admin posts an announcement, it reaches BHWs in that barangay but not a sibling barangay, and delete removes it for everyone", async ({
  page,
  request,
}) => {
  const marker = `e2e.announce.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/announcements");
  await page.getByLabel("Mensahe (Filipino)").fill(`Tala mula sa barangay. ${marker}`);
  await page.getByLabel("Mensahe (English)").fill(`Note from the barangay. ${marker}`);

  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("rpc_announcement_create")),
    page.getByRole("button", { name: "I-post" }).click(),
  ]);
  const createBody = (await createResponse.json()) as Array<{ announcement_id: string }>;
  const announcementId = createBody[0]?.announcement_id;
  expect(announcementId).toBeTruthy();

  await expect(page.getByText(marker).first()).toBeVisible();

  // Same-barangay BHW can see it (RLS: announcement's org unit is at-or-above viewer's own).
  const sameBarangayToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
  const visibleToSameBarangay = await restGet(
    request,
    sameBarangayToken,
    `announcements?id=eq.${announcementId}`,
  );
  expect(visibleToSameBarangay).toHaveLength(1);

  // A BHW in a sibling barangay (Anos) must not see a Batong Malake-scoped post.
  const otherBarangayToken = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);
  const visibleToOtherBarangay = await restGet(
    request,
    otherBarangayToken,
    `announcements?id=eq.${announcementId}`,
  );
  expect(visibleToOtherBarangay).toHaveLength(0);

  // Deleting it removes it from both the console and every viewer's feed.
  // RFT C4: Delete now lives inside the same Visibility actions menu as
  // Hide/Archive, and confirms before acting.
  const card = page.locator("article", { hasText: marker });
  await card.getByRole("button", { name: "Mga Aksyon" }).click();
  await card.getByRole("button", { name: "Tanggalin" }).click();
  await card.getByRole("button", { name: "Tanggalin" }).click();
  await expect(page.getByText(marker)).not.toBeVisible();

  const afterDelete = await restGet(request, sameBarangayToken, `announcements?id=eq.${announcementId}`);
  expect(afterDelete).toHaveLength(0);
});

test("a city-level announcement cascades down to a barangay BHW's feed", async ({ page, request }) => {
  const marker = `e2e.announce.city.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  const cityAdminToken = await getAccessToken(request, STABLE_CITY_ADMIN.username, STABLE_CITY_ADMIN.password);
  const createResponse = await request.post(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_announcement_create`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${cityAdminToken}`,
        "Content-Type": "application/json",
      },
      data: {
        p_org_unit_id: "00000000-0000-0000-0000-000000000004", // Los Baños (city level)
        p_body_fil: `Tala mula sa lungsod. ${marker}`,
        p_body_en: `Note from the city. ${marker}`,
      },
    },
  );
  const createBody = (await createResponse.json()) as Array<{ announcement_id: string }>;
  const announcementId = createBody[0]?.announcement_id;
  expect(announcementId).toBeTruthy();

  // Both barangays under Los Baños should see a city-level post.
  const batongMalakeToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
  const anosToken = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);

  expect(await restGet(request, batongMalakeToken, `announcements?id=eq.${announcementId}`)).toHaveLength(1);
  expect(await restGet(request, anosToken, `announcements?id=eq.${announcementId}`)).toHaveLength(1);

  // And it renders on the BHW-facing feed page.
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/announcements");
  await expect(page.getByText(marker).first()).toBeVisible();

  // Clean up via the city admin (in scope for both barangays and the city itself).
  await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_announcement_delete`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      Authorization: `Bearer ${cityAdminToken}`,
      "Content-Type": "application/json",
    },
    data: { p_announcement_id: announcementId },
  });
});

// RFT C4 DoD (docs/role-feature-toggles-plan.md §4.5): hide/show and
// archive/restore on an announcement, driven through
// rpc_content_set_visibility exactly as /admin/announcements calls it.
// Always cleaned up in `finally` via the hard delete, same as the specs
// above.
test("hiding, then archiving, an announcement takes it out of a BHW's feed; showing/restoring brings it back", async ({
  request,
}) => {
  const marker = `e2e.announce.visibility.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const createResponse = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_announcement_create`, {
    headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    data: {
      p_org_unit_id: BARANGAY_BATONG_MALAKE_ID,
      p_body_fil: `Tala para sa visibility test. ${marker}`,
      p_body_en: `Note for the visibility test. ${marker}`,
    },
  });
  const [{ announcement_id: announcementId }] = (await createResponse.json()) as Array<{
    announcement_id: string;
  }>;

  async function setVisibility(action: "hide" | "show" | "archive" | "restore") {
    const response = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_content_set_visibility`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: { p_type: "announcement", p_id: announcementId, p_action: action },
    });
    expect(response.status(), `rpc_content_set_visibility(${action})`).toBe(204);
  }

  async function bhwCanReadAnnouncement(): Promise<boolean> {
    const bhwToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
    const rows = await restGet(request, bhwToken, `announcements?id=eq.${announcementId}`);
    return rows.length === 1;
  }

  try {
    expect(await bhwCanReadAnnouncement()).toBe(true);

    await setVisibility("hide");
    expect(await bhwCanReadAnnouncement()).toBe(false);

    await setVisibility("show");
    expect(await bhwCanReadAnnouncement()).toBe(true);

    await setVisibility("archive");
    expect(await bhwCanReadAnnouncement()).toBe(false);

    await setVisibility("restore");
    expect(await bhwCanReadAnnouncement()).toBe(true);
  } finally {
    await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_announcement_delete`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: { p_announcement_id: announcementId },
    });
  }
});

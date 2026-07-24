import { expect, test } from "@playwright/test";
import {
  OTHER_BARANGAY_BHW,
  STABLE_ADMIN,
  STABLE_BHW,
  STABLE_CITY_ADMIN,
  getAccessToken,
  restGet,
} from "./fixtures/auth";

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
  await page.getByRole("button", { name: "Tanggalin" }).first().click();
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

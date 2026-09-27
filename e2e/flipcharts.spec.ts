import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  STABLE_BHW,
  createThrowawayDesigner,
  getAccessToken,
  restGet,
} from "./fixtures/auth";

const TINY_PNG = path.join(__dirname, "fixtures", "tiny.png");

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

test("a designer drafts a flip chart, an admin reviews and approves it, and a BHW views it client/BHW-side", async ({
  page,
  request,
}) => {
  const marker = `e2e.flipchart.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const designer = await createThrowawayDesigner(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  await page.goto("/login");
  await page.getByLabel("Username").fill(designer.username);
  await page.getByLabel("Password").fill(designer.tempPassword);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/change-password", { timeout: 10_000 });
  await page.getByLabel("Bagong password", { exact: true }).fill("DesignerPw2026!");
  await page.getByLabel("Kumpirmahin ang bagong password").fill("DesignerPw2026!");
  await page.getByRole("button", { name: "I-save ang password" }).click();
  await expect(page).toHaveURL("/consent", { timeout: 10_000 });
  await page.getByRole("button", { name: "Sumasang-ayon ako" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/designer/flipcharts");
  await page.getByLabel("Pamagat (Filipino)").fill(`Tsart fil ${marker}`);
  await page.getByLabel("Pamagat (English)").fill(`Chart en ${marker}`);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(TINY_PNG);
  await expect(page.getByRole("button", { name: "Alisin ang larawan" })).toBeVisible({ timeout: 15_000 });

  await page.getByLabel("Script para sa BHW (Filipino)").fill(`Script fil ${marker}`);
  await page.getByLabel("Script para sa BHW (English)").fill(`Script en ${marker}`);

  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("rpc_flipchart_create")),
    page.getByRole("button", { name: "I-save bilang draft" }).click(),
  ]);
  const createBody = (await createResponse.json()) as Array<{ flip_chart_id: string }>;
  const flipChartId = createBody[0]?.flip_chart_id;
  expect(flipChartId).toBeTruthy();

  // Still a draft: invisible to a BHW.
  const bhwToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
  expect(await restGet(request, bhwToken, `flip_charts?id=eq.${flipChartId}`)).toHaveLength(0);

  await page.getByRole("button", { name: "Isumite para sa pagsusuri" }).click();
  await expect(page.getByText("Nasa Pagsusuri")).toBeVisible();

  // An admin reviews and approves it.
  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/flipcharts");
  const reviewQueue = page.getByRole("region", { name: "Mga Nakabinbing Pagsusuri" });
  const reviewItem = reviewQueue.getByRole("listitem").filter({ hasText: `Chart en ${marker}` });
  await expect(reviewItem).toBeVisible();
  await expect(reviewItem.getByText(`Script en ${marker}`)).toBeVisible();
  await reviewItem.getByRole("button", { name: "Aprubahan" }).click();

  const allCharts = page.getByRole("region", { name: "Lahat ng Flip Chart" });
  const allChartsItem = allCharts.getByRole("listitem").filter({ hasText: `Chart en ${marker}` });
  await expect(allChartsItem.getByText("Nailathala")).toBeVisible();

  // A BHW now sees it published, and can toggle between the client-facing
  // and BHW-facing views.
  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto(`/flipcharts/${flipChartId}`);
  await expect(page.getByRole("heading", { name: `Chart en ${marker}` })).toBeVisible();
  await page.getByRole("button", { name: "BHW script" }).click();
  await expect(page.getByText(`Script en ${marker}`)).toBeVisible();
});

// RFT C5 DoD (docs/role-feature-toggles-plan.md §7 C5): hide/show and
// archive/restore on a published flip chart, driven through
// rpc_content_set_visibility exactly as /admin/flipcharts calls it. A
// published chart can't be hard-deleted (rpc_flipchart_delete rejects it),
// so this always ends archived rather than restored — out of every BHW's
// view, same spirit as the kb-authoring spec's "unpublish" cleanup.
test("hiding, then archiving, a published flip chart takes it out of a BHW's reads; showing/restoring brings it back", async ({
  request,
}) => {
  const marker = `e2e.flipchart.visibility.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const createResponse = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_flipchart_create`, {
    headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    data: {
      p_title_fil: `Tsart visibility fil ${marker}`,
      p_title_en: `Chart visibility en ${marker}`,
      p_pages: [
        {
          client_image_url: "https://example.invalid/tiny.png",
          client_caption_fil: "",
          client_caption_en: "",
          script_fil: `Script fil ${marker}`,
          script_en: `Script en ${marker}`,
        },
      ],
    },
  });
  const [{ flip_chart_id: flipChartId }] = (await createResponse.json()) as Array<{ flip_chart_id: string }>;

  async function setVisibility(action: "hide" | "show" | "archive" | "restore") {
    const response = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_content_set_visibility`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: { p_type: "flipchart", p_id: flipChartId, p_action: action },
    });
    expect(response.status(), `rpc_content_set_visibility(${action})`).toBe(204);
  }

  async function bhwCanReadChart(): Promise<boolean> {
    const bhwToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
    const rows = await restGet(request, bhwToken, `flip_charts?id=eq.${flipChartId}`);
    return rows.length === 1;
  }

  try {
    expect(await bhwCanReadChart()).toBe(true);

    await setVisibility("hide");
    expect(await bhwCanReadChart()).toBe(false);

    await setVisibility("show");
    expect(await bhwCanReadChart()).toBe(true);

    await setVisibility("archive");
    expect(await bhwCanReadChart()).toBe(false);

    await setVisibility("restore");
    expect(await bhwCanReadChart()).toBe(true);
  } finally {
    // Best-effort: leaves the chart out of every BHW's view regardless of
    // which step above the test failed on (so it may already be archived).
    await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_content_set_visibility`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: { p_type: "flipchart", p_id: flipChartId, p_action: "archive" },
    });
  }
});

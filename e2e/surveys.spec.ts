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

test("a barangay admin creates and publishes a survey, a same-barangay BHW responds, and results tally correctly", async ({
  page,
}) => {
  const marker = `e2e.survey.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/surveys");
  await page.getByLabel("Pamagat (Filipino)").fill(`Survey fil ${marker}`);
  await page.getByLabel("Pamagat (English)").fill(`Survey en ${marker}`);
  await page.getByLabel("Tanong (Filipino)").fill("Nasiyahan ka ba?");
  await page.getByLabel("Tanong (English)").fill("Are you satisfied?");
  await page.getByLabel("Pagpipilian 1 (Filipino)").fill("Oo");
  await page.getByLabel("Pagpipilian 1 (English)").fill("Yes");
  await page.getByRole("button", { name: "+ Magdagdag ng pagpipilian" }).click();
  await page.getByLabel("Pagpipilian 2 (Filipino)").fill("Hindi");
  await page.getByLabel("Pagpipilian 2 (English)").fill("No");

  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("rpc_survey_create")),
    page.getByRole("button", { name: "Gumawa ng survey" }).click(),
  ]);
  const createBody = (await createResponse.json()) as Array<{ survey_id: string }>;
  const surveyId = createBody[0]?.survey_id;
  expect(surveyId).toBeTruthy();

  const row = page.getByRole("row", { name: new RegExp(`Survey en ${marker}`) });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Ilathala" }).click();
  await expect(row.getByText("Nailathala")).toBeVisible();

  // A same-barangay BHW now sees and can respond to it.
  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto(`/surveys/${surveyId}`);
  await page.getByLabel("Oo", { exact: true }).check();
  await page.getByRole("button", { name: "Isumite" }).click();
  await expect(page.getByText("Salamat sa iyong sagot!")).toBeVisible();

  // Admin sees the tally in the results view.
  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto(`/admin/surveys/${surveyId}`);
  await expect(page.getByText("Oo — 1 sagot")).toBeVisible();
  await expect(page.getByText("Hindi — 0 sagot")).toBeVisible();

  await page.goto("/admin/surveys");
  await page.getByRole("row", { name: new RegExp(`Survey en ${marker}`) }).getByRole("button", { name: "Tanggalin" }).click();
  await expect(page.getByRole("row", { name: new RegExp(`Survey en ${marker}`) })).not.toBeVisible();
});

test("a city-level survey cascades down to a barangay BHW, and a sibling barangay also sees it", async ({
  page,
  request,
}) => {
  const marker = `e2e.survey.city.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  const cityAdminToken = await getAccessToken(request, STABLE_CITY_ADMIN.username, STABLE_CITY_ADMIN.password);
  const createResponse = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_survey_create`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      Authorization: `Bearer ${cityAdminToken}`,
      "Content-Type": "application/json",
    },
    data: {
      p_org_unit_id: "00000000-0000-0000-0000-000000000004", // Los Baños (city level)
      p_title_fil: `City survey fil ${marker}`,
      p_title_en: `City survey en ${marker}`,
      p_description_fil: "",
      p_description_en: "",
      p_is_anonymous: false,
      p_questions: [{ type: "text", prompt_fil: "Puna", prompt_en: "Comment", options: [] }],
    },
  });
  const createBody = (await createResponse.json()) as Array<{ survey_id: string }>;
  const surveyId = createBody[0]?.survey_id;
  expect(surveyId).toBeTruthy();

  await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_survey_set_status`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      Authorization: `Bearer ${cityAdminToken}`,
      "Content-Type": "application/json",
    },
    data: { p_survey_id: surveyId, p_status: "published" },
  });

  const batongMalakeToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
  const anosToken = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);

  expect(await restGet(request, batongMalakeToken, `surveys?id=eq.${surveyId}`)).toHaveLength(1);
  expect(await restGet(request, anosToken, `surveys?id=eq.${surveyId}`)).toHaveLength(1);

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/surveys");
  await expect(page.getByText(`City survey fil ${marker}`)).toBeVisible();

  await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_survey_delete`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      Authorization: `Bearer ${cityAdminToken}`,
      "Content-Type": "application/json",
    },
    data: { p_survey_id: surveyId },
  });
});

// RFT C4 DoD (docs/role-feature-toggles-plan.md §4.5): hide/show and
// archive/restore on a survey, driven through rpc_content_set_visibility
// exactly as /admin/surveys calls it. Always cleaned up in `finally` via
// the hard delete, same as the specs above.
test("hiding, then archiving, a survey takes it out of a BHW's reads; showing/restoring brings it back", async ({
  request,
}) => {
  const marker = `e2e.survey.visibility.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const createResponse = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_survey_create`, {
    headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    data: {
      p_org_unit_id: BARANGAY_BATONG_MALAKE_ID,
      p_title_fil: `Survey visibility fil ${marker}`,
      p_title_en: `Survey visibility en ${marker}`,
      p_description_fil: "",
      p_description_en: "",
      p_is_anonymous: false,
      p_questions: [{ type: "text", prompt_fil: "Puna", prompt_en: "Comment", options: [] }],
    },
  });
  const [{ survey_id: surveyId }] = (await createResponse.json()) as Array<{ survey_id: string }>;

  await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_survey_set_status`, {
    headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    data: { p_survey_id: surveyId, p_status: "published" },
  });

  async function setVisibility(action: "hide" | "show" | "archive" | "restore") {
    const response = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_content_set_visibility`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: { p_type: "survey", p_id: surveyId, p_action: action },
    });
    expect(response.status(), `rpc_content_set_visibility(${action})`).toBe(204);
  }

  async function bhwCanReadSurvey(): Promise<boolean> {
    const bhwToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
    const rows = await restGet(request, bhwToken, `surveys?id=eq.${surveyId}`);
    return rows.length === 1;
  }

  try {
    expect(await bhwCanReadSurvey()).toBe(true);

    await setVisibility("hide");
    expect(await bhwCanReadSurvey()).toBe(false);

    await setVisibility("show");
    expect(await bhwCanReadSurvey()).toBe(true);

    await setVisibility("archive");
    expect(await bhwCanReadSurvey()).toBe(false);

    await setVisibility("restore");
    expect(await bhwCanReadSurvey()).toBe(true);
  } finally {
    await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_survey_delete`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: { p_survey_id: surveyId },
    });
  }
});

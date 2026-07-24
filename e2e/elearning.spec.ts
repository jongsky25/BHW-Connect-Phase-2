import { expect, test } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  OTHER_BARANGAY_BHW,
  STABLE_ADMIN,
  STABLE_BHW,
  STABLE_CITY_ADMIN,
  createThrowawayAssessor,
  getAccessToken,
  onboardThroughLogin,
  restGet,
} from "./fixtures/auth";

test("admin creates a course, a BHW completes it and passes the quiz, an assessor certifies them, and the certificate verifies publicly", async ({
  page,
  request,
}) => {
  const marker = `e2e.course.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const assessor = await createThrowawayAssessor(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/courses");
  await page.getByLabel("Pamagat (Filipino)").fill(`Kurso fil ${marker}`);
  await page.getByLabel("Pamagat (English)").fill(`Course en ${marker}`);
  await page.getByLabel("Uri ng modyul").selectOption("quiz");
  await page.getByLabel("Pamagat ng modyul (Filipino)").fill("Pagsusulit");
  await page.getByLabel("Pamagat ng modyul (English)").fill("Quiz");
  await page.getByRole("button", { name: "+ Magdagdag ng tanong" }).click();
  await page.getByLabel("Tanong (Filipino)").fill("1+1?");
  await page.getByLabel("Tanong (English)").fill("1+1?");
  await page.getByLabel("Pagpipilian 1 (Filipino)").fill("1");
  await page.getByLabel("Pagpipilian 1 (English)").fill("1");
  await page.getByLabel("Pagpipilian 2 (Filipino)").fill("2");
  await page.getByLabel("Pagpipilian 2 (English)").fill("2");
  await page.getByLabel("Tamang sagot").nth(1).check();

  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("rpc_course_create")),
    page.getByRole("button", { name: "Gumawa ng kurso" }).click(),
  ]);
  const createBody = (await createResponse.json()) as Array<{ course_id: string }>;
  const courseId = createBody[0]?.course_id;
  expect(courseId).toBeTruthy();

  const row = page.getByRole("row", { name: new RegExp(`Course en ${marker}`) });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Ilathala" }).click();
  await expect(row.getByText("Nailathala")).toBeVisible();

  // The BHW completes the quiz.
  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto(`/courses/${courseId}`);
  await page.getByLabel("2", { exact: true }).check();
  await page.getByRole("button", { name: "Isumite ang mga sagot" }).click();
  await expect(page.getByText("Pumasa ka! Marka: 100%.")).toBeVisible();

  // The assessor claims the resulting assessment and certifies the BHW.
  await page.goto("/home");
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });
  await onboardThroughLogin(page, assessor.username, assessor.tempPassword, "AssessorPw2026!");

  await page.goto("/assessments");
  const queueItem = page.getByRole("listitem").filter({ hasText: `Course en ${marker}` });
  await expect(queueItem).toBeVisible();
  await queueItem.getByRole("button", { name: "Kunin" }).click();

  const claimedItem = page.getByRole("listitem").filter({ hasText: `Course en ${marker}` });
  await expect(claimedItem).toBeVisible();
  await claimedItem.getByRole("button", { name: "Pasado", exact: true }).click();

  const notice = await page.getByRole("status").textContent();
  const verificationCode = notice?.trim();
  expect(verificationCode).toBeTruthy();

  await page.goto(`/certificates/${verificationCode}`);
  await expect(page.getByText("Wastong sertipiko")).toBeVisible();
  await expect(page.getByText("Stable Pilot BHW")).toBeVisible();
});

test("a city-level course cascades down to a barangay BHW, and a sibling barangay also sees it", async ({ request }) => {
  const marker = `e2e.course.city.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  const cityAdminToken = await getAccessToken(request, STABLE_CITY_ADMIN.username, STABLE_CITY_ADMIN.password);
  const createResponse = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_course_create`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      Authorization: `Bearer ${cityAdminToken}`,
      "Content-Type": "application/json",
    },
    data: {
      p_org_unit_id: "00000000-0000-0000-0000-000000000004", // Los Baños (city level)
      p_title_fil: `Kurso ng lungsod ${marker}`,
      p_title_en: `City course ${marker}`,
      p_description_fil: "",
      p_description_en: "",
      p_quiz_passing_percent: 80,
      p_quiz_max_attempts: 3,
      p_modules: [{ type: "text", title_fil: "Aralin", title_en: "Lesson", body_fil: "X", body_en: "Y" }],
    },
  });
  const createBody = (await createResponse.json()) as Array<{ course_id: string }>;
  const courseId = createBody[0]?.course_id;
  expect(courseId).toBeTruthy();

  await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_course_set_status`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      Authorization: `Bearer ${cityAdminToken}`,
      "Content-Type": "application/json",
    },
    data: { p_course_id: courseId, p_status: "published" },
  });

  const batongMalakeToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
  const anosToken = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);

  expect(await restGet(request, batongMalakeToken, `courses?id=eq.${courseId}`)).toHaveLength(1);
  expect(await restGet(request, anosToken, `courses?id=eq.${courseId}`)).toHaveLength(1);

  await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_course_delete`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      Authorization: `Bearer ${cityAdminToken}`,
      "Content-Type": "application/json",
    },
    data: { p_course_id: courseId },
  });
});

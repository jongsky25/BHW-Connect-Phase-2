import { expect, test } from "@playwright/test";
import {
  BARANGAY_ANOS_ID,
  BARANGAY_BATONG_MALAKE_ID,
  OTHER_BARANGAY_BHW,
  STABLE_ADMIN,
  STABLE_BHW,
  createThrowawayBhw,
  getAccessToken,
  restGet,
} from "./fixtures/auth";

test("a fully onboarded BHW logs in and lands on home", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();

  await expect(page).toHaveURL("/home");
  await expect(page.getByRole("heading", { name: /Stable Pilot BHW/ })).toBeVisible();
});

test("wrong password shows an error without logging in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Mag-login" }).click();

  await expect(page.getByRole("alert")).toHaveText("Mali ang username o password.");
  await expect(page).toHaveURL("/login");
});

test("a newly provisioned BHW is forced through change-password and consent before reaching home", async ({
  page,
  request,
}) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  await page.goto("/login");
  await page.getByLabel("Username").fill(fresh.username);
  await page.getByLabel("Password").fill(fresh.tempPassword);
  await page.getByRole("button", { name: "Mag-login" }).click();

  await expect(page).toHaveURL("/change-password");

  await page.getByLabel("Bagong password").fill("Fresh-Bhw-2026");
  await page.getByLabel("Kumpirmahin ang bagong password").fill("Fresh-Bhw-2026");
  await page.getByRole("button", { name: "I-save ang password" }).click();

  await expect(page).toHaveURL("/consent");

  await page.getByRole("button", { name: "Sumasang-ayon ako" }).click();

  await expect(page).toHaveURL("/home");
  await expect(page.getByRole("heading", { name: new RegExp(fresh.fullName) })).toBeVisible();
});

test("an account locks out after five consecutive failed attempts", async ({ page, request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  await page.goto("/login");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.getByLabel("Username").fill(fresh.username);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Mag-login" }).click();
    await expect(page.getByRole("alert")).toHaveText("Mali ang username o password.");
  }

  // 5th failed attempt trips the lockout.
  await page.getByLabel("Username").fill(fresh.username);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page.getByRole("alert")).toContainText("Naka-lock ang account");

  // Even the correct temp password is rejected while locked.
  await page.getByLabel("Username").fill(fresh.username);
  await page.getByLabel("Password").fill(fresh.tempPassword);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page.getByRole("alert")).toContainText("Naka-lock ang account");
});

test("a BHW cannot read another barangay's org unit row (RLS)", async ({ request }) => {
  const token = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);

  const ownOrgUnit = await restGet(request, token, `org_units?id=eq.${BARANGAY_ANOS_ID}`);
  expect(ownOrgUnit).toHaveLength(1);

  const otherOrgUnit = await restGet(request, token, `org_units?id=eq.${BARANGAY_BATONG_MALAKE_ID}`);
  expect(otherOrgUnit).toHaveLength(0);
});

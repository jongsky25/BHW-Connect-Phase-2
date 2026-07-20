import { expect, test } from "@playwright/test";
import { PILOT_BHW_USERNAME, PILOT_TEMP_PASSWORD } from "../scripts/pilot-fixtures";
import { createE2EServiceClient, isSupabaseConfiguredForE2E } from "./support/service-client";

// INC-1 DoD: "provisioned BHW logs in with temp password -> forced change
// -> consent -> lands on home"; "lockout works". These exercise a live
// Supabase project (real auth, real RLS), so they're skipped until one is
// linked. Run `npm run seed:pilot` against it first.
test.describe("BHW auth flow", () => {
  test.skip(!isSupabaseConfiguredForE2E(), "requires a linked Supabase project — run `npm run seed:pilot` first");

  test.beforeEach(async ({ page }) => {
    // Deterministic assertions regardless of the default locale.
    await page.context().addCookies([
      { name: "BHW_LOCALE", value: "en", domain: "localhost", path: "/" },
    ]);

    // Reset the pilot BHW to a fresh "just provisioned" state so this test
    // is repeatable against a persistent project, not just a one-shot.
    const service = createE2EServiceClient();
    const { data: appUser } = await service
      .from("users")
      .select("id, auth_user_id")
      .ilike("username", PILOT_BHW_USERNAME)
      .single();
    if (!appUser) {
      throw new Error("Pilot BHW not found — run `npm run seed:pilot` first.");
    }
    await service.auth.admin.updateUserById(appUser.auth_user_id, { password: PILOT_TEMP_PASSWORD });
    await service
      .from("users")
      .update({
        must_change_password: true,
        consented_at: null,
        failed_login_attempts: 0,
        locked_until: null,
        status: "active",
      })
      .eq("id", appUser.id);
  });

  test("logs in with a temp password, is forced through change-password and consent, and lands on home", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Username").fill(PILOT_BHW_USERNAME);
    await page.getByLabel("Password", { exact: true }).fill(PILOT_TEMP_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/change-password$/);
    await page.getByLabel("New password").fill("PilotChosen#2026");
    await page.getByLabel("Confirm new password").fill("PilotChosen#2026");
    await page.getByRole("button", { name: "Save and continue" }).click();

    await expect(page).toHaveURL(/\/consent$/);
    await page.getByRole("button", { name: "I understand and agree" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Welcome to BHW Connect" })).toBeVisible();
  });

  test("locks the account out after 5 consecutive failed attempts", async ({ page }) => {
    await page.goto("/login");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.getByLabel("Username").fill(PILOT_BHW_USERNAME);
      await page.getByLabel("Password", { exact: true }).fill("definitely-wrong-password");
      await page.getByRole("button", { name: "Log in" }).click();
      await expect(page.getByRole("alert")).toBeVisible();
    }

    await expect(page.getByRole("alert")).toContainText("15");
  });
});

import { expect, test } from "@playwright/test";

// Verifies the INC-1 auth DoD end-to-end against a real Supabase project:
// "provisioned BHW logs in with temp password -> forced change -> consent
// -> lands on home" plus lockout. Requires:
//   1. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY set (so the
//      running app actually talks to Supabase instead of passing through).
//   2. supabase/migrations applied to that project.
//   3. A seeded BHW account with a known temp password — run
//      `npm run seed` and pass its output through E2E_BHW_USERNAME /
//      E2E_BHW_TEMP_PASSWORD.
//
// Not run by this repo's own CI (no Supabase project provisioned there);
// run manually or from a CI job that has these secrets.

const username = process.env.E2E_BHW_USERNAME;
const tempPassword = process.env.E2E_BHW_TEMP_PASSWORD;
const newPassword = process.env.E2E_BHW_NEW_PASSWORD ?? "a new pilot barangay password";

test.describe("live login flow", () => {
  test.skip(
    !username || !tempPassword,
    "set E2E_BHW_USERNAME / E2E_BHW_TEMP_PASSWORD (see file header) to run this against a real Supabase project",
  );

  test("temp password login -> forced change -> consent -> home", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill(username!);
    await page.getByLabel("Password").fill(tempPassword!);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/change-password");
    await page.getByLabel("New password").fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Save password" }).click();

    await expect(page).toHaveURL("/consent");
    await page.getByRole("button", { name: "I understand and agree" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("locks the account after 5 failed attempts", async ({ page }) => {
    await page.goto("/login");

    for (let attempt = 0; attempt < 5; attempt++) {
      await page.getByLabel("Username").fill(username!);
      await page.getByLabel("Password").fill("definitely-the-wrong-password");
      await page.getByRole("button", { name: "Log in" }).click();
      await page.getByRole("alert").waitFor();
    }

    await expect(page.getByRole("alert")).toContainText("Too many failed attempts");
  });
});

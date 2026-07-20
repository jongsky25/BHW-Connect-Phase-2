import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const hasSupabaseConfig = existsSync(path.join(process.cwd(), ".env.local"));

// Unlike auth.spec.ts, this suite doesn't touch any long-lived fixture: it
// logs in as the stable admin.stable account and creates a throwaway BHW
// (unique username per run) to exercise the full create -> reset ->
// deactivate -> audit-trail loop, so it's safe to re-run repeatedly.
test.describe("INC-2 admin console (live fixture: admin.stable)", () => {
  test.skip(!hasSupabaseConfig, "requires a linked Supabase project (.env.local)");

  test("admin creates a BHW, resets their password, deactivates them, and every action shows up in the audit view", async ({
    page,
  }) => {
    const username = `bhw.e2e.${Date.now()}`;

    await page.goto("/login");
    await page.locator('input[name="username"]').fill("admin.stable");
    await page.locator('input[name="password"]').fill("StableAdmin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL("/");

    await page.goto("/admin/users");

    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="fullName"]').fill("E2E Test BHW");
    await page.getByRole("button", { name: "Gumawa ng user" }).click();

    const tempPasswordPanel = page.getByText(`${username} —`);
    await expect(tempPasswordPanel).toBeVisible();

    const row = page.locator("tr", { hasText: username });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "I-reset ang password" }).click();
    await expect(row.getByText(/Pansamantalang password:/)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "I-deactivate" }).click();
    await expect(row.getByText("Na-deactivate")).toBeVisible();

    await page.goto("/admin/audit");
    await expect(page.getByText(new RegExp(`Nagdagdag.*${username}`))).toBeVisible();
    await expect(page.getByText(new RegExp(`Nag-reset.*${username}`))).toBeVisible();
    await expect(page.getByText(new RegExp(`Na-deactivate.*${username}`))).toBeVisible();

    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByText(new RegExp(`added a new user, ${username}`))).toBeVisible();
    await expect(page.getByText(new RegExp(`reset ${username}'s password`))).toBeVisible();
    await expect(page.getByText(new RegExp(`deactivated ${username}'s account`))).toBeVisible();
  });
});

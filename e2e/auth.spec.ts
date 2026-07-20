import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const hasSupabaseConfig = existsSync(path.join(process.cwd(), ".env.local"));

// These specs exercise the live pilot fixtures end to end and mutate their
// state (password, must_change_password, consented_at, lockout) as a side
// effect — unlike e2e/rls.spec.ts they are not safe to re-run back to back.
// Opt in explicitly, after resetting bhw.pilot to a fresh temp-password
// state (see supabase/migrations/20260720031220_inc1_seed_pilot_org_chain.sql).
const runLiveAuthE2e = hasSupabaseConfig && process.env.RUN_LIVE_AUTH_E2E === "1";

test.describe("INC-1 login flow (live fixture: bhw.pilot)", () => {
  test.skip(!runLiveAuthE2e, "opt-in: set RUN_LIVE_AUTH_E2E=1 after resetting the bhw.pilot fixture");

  test("temp password login forces a password change, then consent, then lands on home", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator('input[name="username"]').fill("bhw.pilot");
    await page.locator('input[name="password"]').fill("TempPass123");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL("/change-password");
    await page.locator('input[name="password"]').fill("NewPilotPass456");
    await page.locator('input[name="confirm"]').fill("NewPilotPass456");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL("/consent");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL("/");
  });
});

test.describe("INC-1 lockout (live fixture: admin.pilot)", () => {
  test.skip(!runLiveAuthE2e, "opt-in: set RUN_LIVE_AUTH_E2E=1; this locks admin.pilot for 15 minutes");

  test("locks the account after five failed attempts", async ({ page }) => {
    await page.goto("/login");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.locator('input[name="username"]').fill("admin.pilot");
      await page.locator('input[name="password"]').fill("DefinitelyWrongPassword!");
      await page.locator('button[type="submit"]').click();
      await page.waitForLoadState("networkidle");
    }

    await expect(page.getByRole("alert")).toContainText("Sobra na sa bilang");
  });
});

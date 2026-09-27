import { request } from "@playwright/test";
import { STABLE_ADMIN, getAccessToken } from "./fixtures/auth";

// Specs publish real announcements, surveys, flip charts, forum threads and
// courses on the shared pilot project, and a failed or retried test skips
// its own cleanup — so every one of them used to stay visible to real users.
// After the whole suite, purge everything carrying an `e2e.` marker
// (supabase/migrations/20261004000000_e2e_purge_test_content.sql).
//
// p_min_age_hours => 0 is only safe because CI runs one E2E job at a time
// against the pilot (ci.yml's e2e-wait), so this can't delete another run's
// in-flight fixtures. A local run could, so it only purges when asked to
// (E2E_PURGE=1). A failed purge never fails the suite; the next run retries.
export default async function globalTeardown() {
  if (!process.env.CI && process.env.E2E_PURGE !== "1") return;

  const context = await request.newContext();
  try {
    const token = await getAccessToken(context, STABLE_ADMIN.username, STABLE_ADMIN.password);
    const response = await context.post(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_e2e_purge_test_content`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: { p_dry_run: false, p_min_age_hours: 0 },
      },
    );
    console.log(`e2e content purge (${response.status()}): ${await response.text()}`);
  } catch (error) {
    console.warn("e2e content purge failed:", error);
  } finally {
    await context.dispose();
  }
}

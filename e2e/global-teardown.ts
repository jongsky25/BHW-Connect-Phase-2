import { request } from "@playwright/test";
import { STABLE_ADMIN, getAccessToken } from "./fixtures/auth";

// Specs publish real announcements, surveys, flip charts, forum threads and
// courses on the shared pilot project and provision throwaway `e2e.%` users,
// and a failed or retried test skips its own cleanup — so all of it used to
// stay visible to real users. After the whole suite:
//  1. rpc_e2e_purge_test_content deletes everything carrying an `e2e.`
//     marker, courses included (it calls rpc_e2e_purge_test_courses, which
//     never touches the BHW Reference Manual's courses), plus the
//     notifications it fanned out
//     (supabase/migrations/20261004000000_e2e_purge_test_content.sql).
//  2. rpc_e2e_purge_test_kb deletes the KB entries and chat-guide gap-queue
//     rows the Chat Guide / dashboard / KB specs create, matched by
//     public.e2e_marker_pattern() -- which also knows the single-token
//     `zzz`/`fly`/`dash`/... markers those specs need
//     (supabase/migrations/20261004000200_e2e_purge_test_kb.sql).
//  3. rpc_e2e_purge_test_users deletes the throwaway users and what they
//     authored (supabase/migrations/20261004000100_e2e_purge_test_users_min_age.sql).
//     It runs last so the courses and sessions they touched are gone first.
//
// p_min_age_hours => 0 is only safe because CI runs one E2E job at a time
// against the pilot (ci.yml's e2e-wait), so this can't delete another run's
// in-flight fixtures. A local run could, so it only purges when asked to
// (E2E_PURGE=1). A failed purge never fails the suite; the next run retries.
const PURGES = ["rpc_e2e_purge_test_content", "rpc_e2e_purge_test_kb", "rpc_e2e_purge_test_users"];

export default async function globalTeardown() {
  if (!process.env.CI && process.env.E2E_PURGE !== "1") return;

  const context = await request.newContext();
  try {
    const token = await getAccessToken(context, STABLE_ADMIN.username, STABLE_ADMIN.password);
    for (const rpc of PURGES) {
      const response = await context.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: { p_dry_run: false, p_min_age_hours: 0 },
      });
      console.log(`global-teardown: ${rpc} (${response.status()}): ${await response.text()}`);
    }
  } catch (error) {
    console.warn("global-teardown: e2e purge failed:", error);
  } finally {
    await context.dispose();
  }
}

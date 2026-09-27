// Every course-creating spec (elearning.spec.ts's first test,
// slide-mode.spec.ts, slide-mode-a11y.spec.ts, lesson-narration.spec.ts's
// narrated/scene fixtures, training-sessions.spec.ts) publishes a course via
// rpc_course_create and never deletes it -- the BHW/assessor activity each
// one drives (quiz attempts, assessments, certificates) trips
// rpc_course_delete's own "course has learner progress"/"recorded test
// attempts" guard, so a plain per-spec cleanup call isn't an option.
// rpc_e2e_purge_test_courses (supabase/migrations/
// 20261002000400_e2e_test_course_purge.sql) is a full cascade-safe delete
// keyed on the `e2e.<spec-tag>.<epoch-ms>.<random>` marker every one of
// those specs embeds in the course title. e2e-test-courses-purge.yml's
// weekly dry-run is a safety net for whatever slips through; this global
// teardown is the actual fix at the source -- it runs once after the whole
// suite finishes, and specs run serially (playwright.config.ts: `workers: 1`,
// plus `.github/workflows/ci.yml`'s concurrency group so only one E2E job
// ever runs against the shared pilot project at a time), so every course
// this run created is provably done by the time this fires. `p_min_age_hours:
// 0` is therefore safe here specifically -- it is NOT safe as the default
// for the scheduled workflow, which has no such guarantee about what else
// might be mid-run.
async function globalTeardown() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminPassword = process.env.E2E_STABLE_ADMIN_PASSWORD;
  if (!supabaseUrl || !anonKey || !adminPassword) {
    console.warn("global-teardown: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / " +
      "E2E_STABLE_ADMIN_PASSWORD not set, skipping e2e course purge");
    return;
  }

  const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin.stable@bhw.local", password: adminPassword }),
  });
  const tokenBody = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!tokenBody.access_token) {
    console.warn("global-teardown: failed to sign in as admin.stable, skipping e2e course purge:", tokenBody);
    return;
  }

  const purgeResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/rpc_e2e_purge_test_courses`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${tokenBody.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_dry_run: false, p_min_age_hours: 0 }),
  });
  const purgeBody = await purgeResponse.json().catch(() => null);
  if (!purgeResponse.ok) {
    console.warn("global-teardown: rpc_e2e_purge_test_courses failed:", purgeResponse.status, purgeBody);
    return;
  }
  console.log("global-teardown: purged e2e test courses:", purgeBody);
}

export default globalTeardown;

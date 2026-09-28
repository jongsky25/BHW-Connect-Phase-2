import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Next's dev/build server loads .env.local itself; the Playwright test
// process is separate and needs it too (auth specs call the Supabase REST
// API directly). CI sets these as real environment variables already, so
// a missing .env.local there is expected and safe to ignore.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

// E2E gets its own Supabase project so its logins and throwaway users don't
// spend the pilot's disk I/O budget. .env.local usually points the app at the
// pilot, so E2E_SUPABASE_* override it for this process and the web server it
// starts (Next never lets a .env file override an already-set variable).
if (process.env.E2E_SUPABASE_URL) process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.E2E_SUPABASE_URL;
if (process.env.E2E_SUPABASE_ANON_KEY) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY;

const PILOT_PROJECT_REF = "ltzicxyefizxoqhfuuzc";
if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(PILOT_PROJECT_REF)) {
  throw new Error(
    "E2E is pointed at the pilot Supabase project. Set E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY " +
      "to the bhw-connect-e2e project (see docs/deploy-runbook.md).",
  );
}

// Some sandboxes pre-install a Chromium build that predates this package's
// expected revision and block re-downloading; use it directly when present,
// otherwise fall back to Playwright's normal managed browser (e.g. in CI).
const pinnedChromium = "/opt/pw-browsers/chromium";
const chromiumExecutablePath = existsSync(pinnedChromium) ? pinnedChromium : undefined;

export default defineConfig({
  testDir: "./e2e",
  // Every spec shares one Supabase project: global feature flags that specs
  // toggle (chat_conversation, offline_pwa, kb_articles, course_sessions) and
  // the stable accounts, whose sign-out is global and ends that account's
  // other sessions. Two workers race on both, so the suite must run serially.
  // Playwright's default is half the CPU cores, which became 2 workers once
  // GitHub's ubuntu-latest runners grew to 4 vCPUs.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The longest specs are whole end-to-end journeys, not single interactions:
  // forum.spec.ts alone signs in three times (admin -> BHW -> sibling BHW ->
  // admin), each a full login + consent + navigation round trip, and
  // elearning.spec.ts onboards a fresh BHW then walks a course, quiz,
  // assessment and certificate. Playwright's 30s default left those with no
  // headroom, so they were the first to fail as the shared CI project grew,
  // timing out mid-journey rather than on any specific assertion. This is
  // budget for work those tests genuinely do — no assertion is relaxed.
  timeout: 60_000,
  // Purges the e2e-marked content and throwaway users specs leave on the
  // shared E2E project -- see e2e/global-teardown.ts.
  globalTeardown: "./e2e/global-teardown.ts",
  reporter: "line",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    // CI builds once (see .github/workflows/ci.yml) and reuses it here and
    // for the Lighthouse budget check; locally, build on demand.
    command: process.env.CI ? "npm run start" : "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: chromiumExecutablePath
          ? { executablePath: chromiumExecutablePath }
          : {},
      },
    },
  ],
});

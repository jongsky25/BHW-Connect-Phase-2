import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Next's dev/build server loads .env.local itself; the Playwright test
// process is separate and needs it too (auth specs call the Supabase REST
// API directly). CI sets these as real environment variables already, so
// a missing .env.local there is expected and safe to ignore.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

// Some sandboxes pre-install a Chromium build that predates this package's
// expected revision and block re-downloading; use it directly when present,
// otherwise fall back to Playwright's normal managed browser (e.g. in CI).
const pinnedChromium = "/opt/pw-browsers/chromium";
const chromiumExecutablePath = existsSync(pinnedChromium) ? pinnedChromium : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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

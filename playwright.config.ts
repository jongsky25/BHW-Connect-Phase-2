import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Playwright's test runner is a separate process from `next dev`/`next start`
// and doesn't source .env.local the way Next.js does. Load it here so specs
// that talk to Supabase directly (e2e/rls.spec.ts) can read
// NEXT_PUBLIC_SUPABASE_URL/ANON_KEY; the app's own webServer process loads
// .env.local itself regardless.
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([\w.-]+)=(.*)$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
}
loadEnvLocal();

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

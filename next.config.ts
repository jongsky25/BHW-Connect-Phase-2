import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
import { assertPilotAllowed } from "./scripts/lib/pilot-guard.mjs";

// next dev / build / start outside Vercel must not run against the pilot.
assertPilotAllowed(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Lesson media in public/training/ (narration mp3s, clips, captions,
        // figures, PDFs) is content-hashed by the loaders (name.<hash>.mp3,
        // name-<hash>.svg), so a changed file always gets a new URL. Without
        // this, Vercel served each with max-age=0 and every replay of a clip
        // went back to the CDN. Matched by extension, since /training/... is
        // also the manual's page route.
        source: "/training/:path*.:ext(mp3|mp4|webm|vtt|pdf|svg|jpg|png|webp)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Without an auth token (local dev, forks without the CI secret) the
  // plugin just skips the source-map upload step — same "runs fine
  // unconfigured" convention as the Supabase env wiring.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});

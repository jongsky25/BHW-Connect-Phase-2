import * as Sentry from "@sentry/nextjs";

// No-op until SENTRY_DSN is set, same convention as the Supabase client
// wiring in src/lib/supabase/env.ts — the app works identically with or
// without an error-tracking project configured.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: Boolean(process.env.SENTRY_DSN),
});

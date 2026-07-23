import type * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// A static `import * as Sentry from "@sentry/nextjs"` bundles the whole
// browser SDK into every page's initial JS regardless of whether it's
// enabled — `enabled: false` only stops it from sending events at
// runtime. Dynamically importing it only when a DSN is actually
// configured keeps unconfigured deployments (no project has set one
// yet) from paying that bundle-size cost at all.
let sentry: typeof Sentry | null = null;
if (dsn) {
  import("@sentry/nextjs").then((mod) => {
    sentry = mod;
    mod.init({ dsn, tracesSampleRate: 0.1 });
  });
}

export const onRouterTransitionStart: typeof Sentry.captureRouterTransitionStart = (...args) => {
  sentry?.captureRouterTransitionStart(...args);
};

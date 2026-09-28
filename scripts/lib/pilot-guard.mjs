// The pilot project is the one database real BHWs use, on the Supabase free
// plan's Disk IO budget. On 27 Sep 2026 CI and dev traffic (98% of its
// requests that day) spent that budget and took the pilot down for hours —
// see docs/dev-efficiency-usage-audit.md. Dev servers, E2E runs and loader
// scripts therefore refuse to point at it unless the caller opts in with
// ALLOW_PILOT=1 (a reviewed migration, a deliberate content load, the
// post-deploy smoke check). Vercel deployments are the app itself and are
// always allowed.

export const PILOT_PROJECT_REF = "ltzicxyefizxoqhfuuzc";

export function isPilot(urlOrRef) {
  return typeof urlOrRef === "string" && urlOrRef.includes(PILOT_PROJECT_REF);
}

export function assertPilotAllowed(urlOrRef, context, env = process.env) {
  if (!isPilot(urlOrRef)) return;
  if (env.VERCEL === "1" || env.ALLOW_PILOT === "1") return;
  throw new Error(
    `${context} is pointed at the pilot Supabase project (${PILOT_PROJECT_REF}), ` +
      "which is reserved for real users. Use the local stack (npx supabase start, " +
      "--project local) or the dev project instead. For a deliberate pilot " +
      "operation, re-run with ALLOW_PILOT=1.",
  );
}

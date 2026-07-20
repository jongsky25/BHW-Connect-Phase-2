// Shared, side-effect-free constants for the pilot seed data — imported by
// both scripts/seed-pilot.ts and e2e/auth.spec.ts. No env var reads here:
// importing this must never throw when Supabase isn't configured, since
// Playwright collects all spec files up front regardless of test.skip().
export const PILOT_TEMP_PASSWORD = "BhwPilot#2026";
export const PILOT_ADMIN_USERNAME = "admin.pilot";
export const PILOT_BHW_USERNAME = "bhw.pilot";

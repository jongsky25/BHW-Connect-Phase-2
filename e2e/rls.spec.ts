import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const hasSupabaseConfig = existsSync(path.join(process.cwd(), ".env.local"));

// bhw.stable lives in Barangay Batong Malake; bhw.other lives in the
// sibling Barangay Anos (see supabase/migrations seed comment). Neither
// fixture is mutated by these checks, so this file is safe to re-run.
const STABLE_EMAIL = "bhw.stable@bhw.local";
const STABLE_PASSWORD = "StablePilot123";
const OWN_ORG_UNIT_ID = "00000000-0000-0000-0000-000000000005";
const OTHER_ORG_UNIT_ID = "00000000-0000-0000-0000-000000000006";
const OTHER_USERNAME = "bhw.other";

test.describe("RLS org-unit scoping (INC-1 DoD)", () => {
  test.skip(!hasSupabaseConfig, "requires a linked Supabase project (.env.local)");

  test("a BHW cannot read org_units or users outside their own barangay", async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: STABLE_EMAIL,
      password: STABLE_PASSWORD,
    });
    expect(signInError).toBeNull();

    const { data: otherOrgUnit, error: otherOrgUnitError } = await supabase
      .from("org_units")
      .select("id")
      .eq("id", OTHER_ORG_UNIT_ID);
    expect(otherOrgUnitError).toBeNull();
    expect(otherOrgUnit).toEqual([]);

    const { data: otherUser, error: otherUserError } = await supabase
      .from("users")
      .select("id")
      .eq("username", OTHER_USERNAME);
    expect(otherUserError).toBeNull();
    expect(otherUser).toEqual([]);

    // Sanity check: the same BHW can still read their own org unit — an
    // empty result above means "blocked by RLS", not "table unreachable".
    const { data: ownOrgUnit } = await supabase
      .from("org_units")
      .select("id")
      .eq("id", OWN_ORG_UNIT_ID);
    expect(ownOrgUnit).toHaveLength(1);

    await supabase.auth.signOut();
  });
});

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { createE2EServiceClient, isSupabaseConfiguredForE2E } from "./support/service-client";

// INC-1 DoD: "a BHW cannot query another org unit's rows (RLS test)".
// Exercises real RLS policies against a live Supabase project, so it's
// skipped until one is linked (see auth.spec.ts).
test.describe("users table RLS", () => {
  test.skip(!isSupabaseConfiguredForE2E(), "requires a linked Supabase project");

  test("a BHW cannot read a user row outside their org unit, but can read their own", async () => {
    const service = createE2EServiceClient();
    const suffix = Date.now();
    const password = "RlsTestPass#2026";

    const { data: barangayA } = await service
      .from("org_units")
      .insert({ name: `RLS test barangay A ${suffix}`, level: "barangay" })
      .select("id")
      .single();
    const { data: barangayB } = await service
      .from("org_units")
      .insert({ name: `RLS test barangay B ${suffix}`, level: "barangay" })
      .select("id")
      .single();
    if (!barangayA || !barangayB) throw new Error("failed to seed RLS test org units");

    const userA = await createTestBhw(service, `rls.test.a.${suffix}`, barangayA.id, password);
    const userB = await createTestBhw(service, `rls.test.b.${suffix}`, barangayB.id, password);

    try {
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error: signInError } = await anonClient.auth.signInWithPassword({
        email: `rls.test.a.${suffix}@bhw.local`,
        password,
      });
      expect(signInError).toBeNull();

      const { data: otherOrgUnitRows, error: otherOrgUnitError } = await anonClient
        .from("users")
        .select("id")
        .eq("id", userB.appUserId);
      expect(otherOrgUnitError).toBeNull();
      expect(otherOrgUnitRows).toEqual([]);

      const { data: ownRows, error: ownRowError } = await anonClient
        .from("users")
        .select("id")
        .eq("id", userA.appUserId);
      expect(ownRowError).toBeNull();
      expect(ownRows).toHaveLength(1);
    } finally {
      await service.auth.admin.deleteUser(userA.authUserId);
      await service.auth.admin.deleteUser(userB.authUserId);
      await service.from("org_units").delete().in("id", [barangayA.id, barangayB.id]);
    }
  });
});

async function createTestBhw(
  service: ReturnType<typeof createE2EServiceClient>,
  username: string,
  orgUnitId: string,
  password: string,
) {
  const { data: authUser, error: authError } = await service.auth.admin.createUser({
    email: `${username}@bhw.local`,
    password,
    email_confirm: true,
  });
  if (authError || !authUser.user) throw authError ?? new Error("createUser returned no user");

  const { data: appUser, error: profileError } = await service
    .from("users")
    .insert({
      auth_user_id: authUser.user.id,
      username,
      full_name: username,
      role: "bhw",
      org_unit_id: orgUnitId,
      status: "active",
      must_change_password: false,
    })
    .select("id")
    .single();
  if (profileError || !appUser) throw profileError ?? new Error("insert into users returned no row");

  return { authUserId: authUser.user.id, appUserId: appUser.id as string };
}

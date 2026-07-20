/**
 * Seeds one pilot org-unit chain (national -> ... -> barangay) plus one
 * admin and one BHW test account, both provisioned with a temp password
 * and must_change_password=true — the starting state the INC-1 DoD E2E
 * test exercises (log in with temp password -> forced change -> consent
 * -> home).
 *
 * Requires a linked Supabase project. Run with:
 *   npm run seed:pilot
 *
 * Safe to re-run: skips any org unit or user that already exists.
 */
import { createClient } from "@supabase/supabase-js";
import { PILOT_ADMIN_USERNAME, PILOT_BHW_USERNAME, PILOT_TEMP_PASSWORD } from "./pilot-fixtures";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
  }
  return value;
}

const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface OrgUnitSeed {
  name: string;
  level: "national" | "regional" | "provincial" | "city_municipal" | "barangay";
}

const ORG_UNIT_CHAIN: OrgUnitSeed[] = [
  { name: "National (DOH) — Pilot", level: "national" },
  { name: "Region — Pilot", level: "regional" },
  { name: "Province — Pilot", level: "provincial" },
  { name: "City/Municipality — Pilot", level: "city_municipal" },
  { name: "Barangay — Pilot", level: "barangay" },
];

async function upsertOrgUnit(name: string, level: string, parentId: string | null): Promise<string> {
  const { data: existing, error: selectError } = await supabase
    .from("org_units")
    .select("id")
    .eq("name", name)
    .eq("level", level)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id as string;

  const { data: inserted, error: insertError } = await supabase
    .from("org_units")
    .insert({ name, level, parent_id: parentId })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return inserted.id as string;
}

async function upsertPilotUser(input: {
  username: string;
  fullName: string;
  role: "admin" | "bhw";
  orgUnitId: string;
}): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("id")
    .ilike("username", input.username)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) {
    console.log(`Skipped ${input.username} (already provisioned).`);
    return;
  }

  const email = `${input.username.toLowerCase()}@bhw.local`;
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: PILOT_TEMP_PASSWORD,
    email_confirm: true,
  });
  if (authError) throw authError;

  const { error: profileError } = await supabase.from("users").insert({
    auth_user_id: authUser.user.id,
    username: input.username,
    full_name: input.fullName,
    role: input.role,
    org_unit_id: input.orgUnitId,
    status: "active",
    must_change_password: true,
  });
  if (profileError) throw profileError;

  console.log(`Provisioned ${input.role} "${input.username}" (temp password: ${PILOT_TEMP_PASSWORD}).`);
}

async function main() {
  let parentId: string | null = null;
  for (const unit of ORG_UNIT_CHAIN) {
    parentId = await upsertOrgUnit(unit.name, unit.level, parentId);
  }
  const barangayId = parentId;
  if (!barangayId) throw new Error("org unit chain seeding failed to produce a barangay id");

  // Every barangay needs >=1 active admin (delivery-plan.md §4 account
  // lifecycle rule) alongside the BHW the DoD test logs in as.
  await upsertPilotUser({
    username: PILOT_ADMIN_USERNAME,
    fullName: "Pilot Admin",
    role: "admin",
    orgUnitId: barangayId,
  });
  await upsertPilotUser({
    username: PILOT_BHW_USERNAME,
    fullName: "Pilot BHW",
    role: "bhw",
    orgUnitId: barangayId,
  });

  console.log("Pilot seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

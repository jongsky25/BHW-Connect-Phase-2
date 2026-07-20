// INC-1 pilot seed: creates one admin and one BHW account in the seeded
// pilot barangay (supabase/migrations/20260720000006_seed_pilot_org_chain.sql)
// so there's something to log in with for manual testing or the live E2E
// login spec. Requires a Supabase project with migrations applied.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs
//
// The service role key bypasses RLS by design — never expose it to the
// browser or commit it. Get it from Project Settings > API in the
// Supabase dashboard; it is NOT the same as NEXT_PUBLIC_SUPABASE_ANON_KEY.

import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PILOT_BARANGAY_ID = "00000000-0000-0000-0000-000000000005";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function tempPassword() {
  return `Bhw-Pilot-${randomInt(100000, 999999)}`;
}

async function seedAccount({ username, fullName, role }) {
  const email = `${username}@bhw.local`;
  const password = tempPassword();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    throw new Error(`Failed to create auth user for ${username}: ${createError.message}`);
  }

  const { error: profileError } = await supabase.from("users").insert({
    auth_user_id: created.user.id,
    username,
    full_name: fullName,
    role,
    org_unit_id: PILOT_BARANGAY_ID,
    status: "active",
    must_change_password: true,
  });

  if (profileError) {
    throw new Error(`Failed to create profile row for ${username}: ${profileError.message}`);
  }

  return { username, password, role };
}

const accounts = [
  { username: "admin.pilot", fullName: "Pilot Admin", role: "admin" },
  { username: "bhw.pilot", fullName: "Pilot BHW", role: "bhw" },
];

const results = [];
for (const account of accounts) {
  results.push(await seedAccount(account));
}

console.log("Seeded pilot accounts (temp password, must be changed on first login):\n");
for (const { username, password, role } of results) {
  console.log(`  ${role.padEnd(5)} username: ${username}  password: ${password}`);
}

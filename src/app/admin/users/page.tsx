import { UsersConsole } from "@/components/admin/users-console";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: orgUnits }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, username, full_name, role, org_unit_id, status, contact_number, email, address, org_units(name)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("org_units").select("id, name, level").order("name"),
  ]);

  return (
    <UsersConsole
      initialUsers={users ?? []}
      orgUnits={orgUnits ?? []}
    />
  );
}

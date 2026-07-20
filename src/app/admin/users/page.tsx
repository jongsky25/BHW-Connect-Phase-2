import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { CreateUserForm } from "./create-user-form";
import { UserRowActions } from "./user-row-actions";

interface UserRow {
  id: string;
  username: string;
  full_name: string;
  role: "bhw" | "admin";
  status: "invited" | "active" | "deactivated";
  org_units: { name: string } | null;
}

export default async function AdminUsersPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: users }, { data: orgUnits }] = await Promise.all([
    supabase
      .from("users")
      .select("id, username, full_name, role, status, org_units(name)")
      .order("full_name")
      .returns<UserRow[]>(),
    supabase.from("org_units").select("id, name").order("name"),
  ]);

  const statusLabel = (status: UserRow["status"]) =>
    status === "active"
      ? t("statusActive")
      : status === "deactivated"
        ? t("statusDeactivated")
        : t("statusInvited");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("usersHeading")}</h1>

      <CreateUserForm orgUnits={orgUnits ?? []} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-ink/60">
              <th className="py-2 pr-4 font-medium">{t("fullName")}</th>
              <th className="py-2 pr-4 font-medium">{t("username")}</th>
              <th className="py-2 pr-4 font-medium">{t("role")}</th>
              <th className="py-2 pr-4 font-medium">{t("orgUnit")}</th>
              <th className="py-2 pr-4 font-medium">{t("status")}</th>
              <th className="py-2 pr-4 font-medium">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {!users || users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-ink/60">
                  {t("noUsers")}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-ink/5 align-top">
                  <td className="py-2 pr-4 text-ink">{user.full_name}</td>
                  <td className="py-2 pr-4 text-ink/70">{user.username}</td>
                  <td className="py-2 pr-4 text-ink/70">
                    {user.role === "admin" ? t("roleAdmin") : t("roleBhw")}
                  </td>
                  <td className="py-2 pr-4 text-ink/70">{user.org_units?.name ?? "—"}</td>
                  <td className="py-2 pr-4 text-ink/70">{statusLabel(user.status)}</td>
                  <td className="py-2 pr-4">
                    <UserRowActions userId={user.id} status={user.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

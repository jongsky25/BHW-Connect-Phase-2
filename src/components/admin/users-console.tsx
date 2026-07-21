"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import type { AdminUserRow, OrgUnitOption } from "@/lib/admin/types";
import { CreateUserForm } from "./create-user-form";
import { UserRow } from "./user-row";

type Props = {
  initialUsers: AdminUserRow[];
  orgUnits: OrgUnitOption[];
};

export function UsersConsole({ initialUsers, orgUnits }: Props) {
  const t = useTranslations("admin.users");
  const router = useRouter();
  const [tempPassword, setTempPassword] = useState<{ username: string; tempPassword: string } | null>(
    null,
  );

  function handleChanged() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>

      {tempPassword ? (
        <div className="flex items-start justify-between gap-4 rounded-md bg-celebration px-4 py-3 text-celebration-ink">
          <p role="status" className="text-sm">
            {t("tempPasswordNotice", {
              username: tempPassword.username,
              password: tempPassword.tempPassword,
            })}
          </p>
          <button
            type="button"
            onClick={() => setTempPassword(null)}
            className="shrink-0 text-sm font-medium underline"
          >
            {t("dismiss")}
          </button>
        </div>
      ) : null}

      <CreateUserForm
        orgUnits={orgUnits}
        onCreated={(result) => {
          setTempPassword(result);
          router.refresh();
        }}
      />

      {initialUsers.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="overflow-x-auto rounded-md border border-ink/10">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="bg-ink/5">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colUsername")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colFullName")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colRole")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colOrgUnit")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colStatus")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {initialUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  orgUnits={orgUnits}
                  onChanged={handleChanged}
                  onTempPassword={setTempPassword}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import type { AdminUserRow } from "@/lib/admin/types";
import type { OrgUnitNode } from "@/lib/org-units";
import { pageCount, userListHref } from "@/lib/admin/user-list";
import { CreateUserForm } from "./create-user-form";
import { UserRow } from "./user-row";

type Props = {
  initialUsers: AdminUserRow[];
  rootOrgUnit: OrgUnitNode;
  query: string;
  page: number;
  totalCount: number;
  pageSize: number;
};

export function UsersConsole({ initialUsers, rootOrgUnit, query, page, totalCount, pageSize }: Props) {
  const t = useTranslations("admin.users");
  const router = useRouter();
  const [tempPassword, setTempPassword] = useState<{ username: string; tempPassword: string } | null>(
    null,
  );

  function handleChanged() {
    router.refresh();
  }

  const lastPage = pageCount(totalCount, pageSize);
  const firstShown = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(page * pageSize, totalCount);

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
        rootOrgUnit={rootOrgUnit}
        onCreated={(result) => {
          setTempPassword(result);
          // A new user is the newest row, so send the admin back to the
          // unfiltered first page — otherwise an active search or a later
          // page would hide the account they just made.
          router.push(userListHref("", 1));
          router.refresh();
        }}
      />

      {/* A plain GET form: search survives a reload, is linkable, and works
          before any JavaScript has hydrated. */}
      <form method="get" action="/admin/users" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="user-search" className="text-sm font-medium text-ink">
            {t("searchLabel")}
          </label>
          <input
            id="user-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t("searchPlaceholder")}
            className="w-64 rounded-md border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-on-primary"
        >
          {t("searchSubmit")}
        </button>
        {query ? (
          <Link
            href={userListHref("", 1)}
            className="rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
          >
            {t("searchClear")}
          </Link>
        ) : null}
      </form>

      {initialUsers.length === 0 ? (
        <EmptyState message={query ? t("emptySearch", { query }) : t("empty")} />
      ) : (
        <>
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
                    rootOrgUnit={rootOrgUnit}
                    onChanged={handleChanged}
                    onTempPassword={setTempPassword}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <nav aria-label={t("paginationLabel")} className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-ink/70">
              {t("resultRange", { first: firstShown, last: lastShown, total: totalCount })}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={userListHref(query, page - 1)}
                  className="rounded-md border border-ink/20 px-3 py-1 text-sm font-medium text-ink hover:bg-ink/5"
                >
                  {t("previousPage")}
                </Link>
              ) : null}
              {page < lastPage ? (
                <Link
                  href={userListHref(query, page + 1)}
                  className="rounded-md border border-ink/20 px-3 py-1 text-sm font-medium text-ink hover:bg-ink/5"
                >
                  {t("nextPage")}
                </Link>
              ) : null}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

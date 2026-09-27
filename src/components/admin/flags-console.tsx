"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/empty-state";
import { mapAdminRpcError } from "@/lib/admin/error-messages";
import { PREVIEWABLE_ROLES } from "@/lib/auth/roles";
import { FLAG_ROLE_SCOPE, type FeatureFlagKey, type FeatureFlagRow } from "@/lib/flags/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialFlags: FeatureFlagRow[];
  /** True only for the super admin (plan §2 D3). Everyone else sees the same
   * matrix read-only — no admin, including a plain admin, can change a
   * toggle. */
  canEdit: boolean;
};

// The user-type columns after "Available" (the master switch). Order
// matches FLAG_ROLE_SCOPE and every other role-ordered list in the app.
type RoleColumn = (typeof PREVIEWABLE_ROLES)[number];
type Column = "available" | RoleColumn;

function cellKey(flagKey: string, column: Column) {
  return `${flagKey}:${column}`;
}

export function FlagsConsole({ initialFlags, canEdit }: Props) {
  const t = useTranslations("admin.flags");
  const router = useRouter();
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleAvailable(flag: FeatureFlagRow) {
    const key = cellKey(flag.key, "available");
    setError(null);
    setPendingCell(key);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_flag_toggle", {
        p_key: flag.key,
        p_enabled: !flag.enabled,
      });
      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setPendingCell(null);
    }
  }

  async function handleToggleRole(flag: FeatureFlagRow, role: RoleColumn) {
    const key = cellKey(flag.key, role);
    // Currently disabled for this role → this click turns it back on.
    const enabling = flag.disabled_roles.includes(role);
    setError(null);
    setPendingCell(key);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_flag_set_role", {
        p_key: flag.key,
        p_role: role,
        p_enabled: enabling,
      });
      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setPendingCell(null);
    }
  }

  function FlagSwitch({
    checked,
    pending,
    ariaLabel,
    onClick,
  }: {
    checked: boolean;
    pending: boolean;
    ariaLabel: string;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={pending}
        onClick={onClick}
        className={`min-h-[44px] min-w-[44px] shrink-0 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60 ${
          checked
            ? "border border-success/40 text-success hover:bg-success/5"
            : "border border-danger/40 text-danger hover:bg-danger/5"
        }`}
      >
        {checked ? t("enabledLabel") : t("disabledLabel")}
      </button>
    );
  }

  function StatusText({ checked }: { checked: boolean }) {
    return (
      <span className={`text-sm font-medium ${checked ? "text-success" : "text-danger"}`}>
        {checked ? t("enabledLabel") : t("disabledLabel")}
      </span>
    );
  }

  function AvailableCell({ flag }: { flag: FeatureFlagRow }) {
    if (!canEdit) return <StatusText checked={flag.enabled} />;
    return (
      <FlagSwitch
        checked={flag.enabled}
        pending={pendingCell === cellKey(flag.key, "available")}
        ariaLabel={t("toggleAvailableLabel", { name: t(`names.${flag.key}`) })}
        onClick={() => handleToggleAvailable(flag)}
      />
    );
  }

  function RoleCell({ flag, role }: { flag: FeatureFlagRow; role: RoleColumn }) {
    const scope = FLAG_ROLE_SCOPE[flag.key as FeatureFlagKey] ?? [];
    if (!scope.includes(role)) {
      return (
        <span className="text-ink/40" aria-label={t("notApplicable")}>
          —
        </span>
      );
    }
    if (!flag.enabled) {
      return <span className="text-xs text-ink/50">{t("offForEveryone")}</span>;
    }
    const checked = !flag.disabled_roles.includes(role);
    if (!canEdit) return <StatusText checked={checked} />;
    return (
      <FlagSwitch
        checked={checked}
        pending={pendingCell === cellKey(flag.key, role)}
        ariaLabel={t("toggleRoleLabel", { name: t(`names.${flag.key}`), role: t(`columns.${role}`) })}
        onClick={() => handleToggleRole(flag, role)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("heading")} description={t("intro")} />
      <p className="text-sm text-ink/70">{t("adminsAlwaysSee")}</p>
      {!canEdit ? <p className="text-sm text-ink/70">{t("readOnlyNote")}</p> : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {initialFlags.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border border-ink/10 md:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-ink/5">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                    {t("columns.feature")}
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                    {t("columns.available")}
                  </th>
                  {PREVIEWABLE_ROLES.map((role) => (
                    <th
                      key={role}
                      className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70"
                    >
                      {t(`columns.${role}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {initialFlags.map((flag) => (
                  <tr key={flag.id} className="border-t border-ink/10">
                    <td className="px-3 py-3">
                      <p className="font-medium text-ink">{t(`names.${flag.key}`)}</p>
                      <p className="text-xs text-ink/60">{flag.description}</p>
                    </td>
                    <td className="px-3 py-3">
                      <AvailableCell flag={flag} />
                    </td>
                    {PREVIEWABLE_ROLES.map((role) => (
                      <td key={role} className="px-3 py-3">
                        <RoleCell flag={flag} role={role} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-4 md:hidden">
            {initialFlags.map((flag) => (
              <li key={flag.id} className="flex flex-col gap-3 rounded-md border border-ink/10 p-4">
                <div>
                  <p className="font-medium text-ink">{t(`names.${flag.key}`)}</p>
                  <p className="text-xs text-ink/60">{flag.description}</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ink/70">{t("columns.available")}</span>
                  <AvailableCell flag={flag} />
                </div>
                {PREVIEWABLE_ROLES.map((role) => (
                  <div key={role} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink/70">{t(`columns.${role}`)}</span>
                    <RoleCell flag={flag} role={role} />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { mapAdminRpcError } from "@/lib/admin/error-messages";
import type { AdminUserRow, OrgUnitOption } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "./form-field";

type Mode = "view" | "edit" | "transfer" | "anonymize-confirm";

type Props = {
  user: AdminUserRow;
  orgUnits: OrgUnitOption[];
  onChanged: () => void;
  onTempPassword: (result: { username: string; tempPassword: string }) => void;
};

const STATUS_KEY: Record<AdminUserRow["status"], string> = {
  active: "statusActive",
  deactivated: "statusDeactivated",
  invited: "statusInvited",
};

export function UserRow({ user, orgUnits, onChanged, onTempPassword }: Props) {
  const t = useTranslations("admin.users");
  const [mode, setMode] = useState<Mode>("view");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(user.full_name);
  const [contactNumber, setContactNumber] = useState(user.contact_number ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [address, setAddress] = useState(user.address ?? "");

  const transferTargets = orgUnits.filter((unit) => unit.id !== user.org_unit_id);
  const [transferTarget, setTransferTarget] = useState(transferTargets[0]?.id ?? "");

  function resetEditFields() {
    setFullName(user.full_name);
    setContactNumber(user.contact_number ?? "");
    setEmail(user.email ?? "");
    setAddress(user.address ?? "");
  }

  async function handleSaveEdit() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_admin_update_profile", {
        p_user_id: user.id,
        p_full_name: fullName.trim(),
        p_contact_number: contactNumber.trim() || null,
        p_email: email.trim() || null,
        p_address: address.trim() || null,
      });

      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }

      setMode("view");
      onChanged();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("rpc_admin_reset_password", {
        p_user_id: user.id,
      });

      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }

      const row = (data as Array<{ temp_password: string }> | null)?.[0];
      if (row) {
        onTempPassword({ username: user.username, tempPassword: row.temp_password });
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSetStatus(nextStatus: "active" | "deactivated") {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_admin_set_status", {
        p_user_id: user.id,
        p_status: nextStatus,
      });

      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }

      onChanged();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer() {
    if (!transferTarget) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_admin_transfer_user", {
        p_user_id: user.id,
        p_new_org_unit_id: transferTarget,
      });

      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }

      setMode("view");
      onChanged();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleExportData() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("rpc_admin_export_user_data", {
        p_user_id: user.id,
      });

      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${user.username}-data-export.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleAnonymize() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_admin_anonymize_user", {
        p_user_id: user.id,
      });

      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }

      setMode("view");
      onChanged();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="border-b border-ink/10 align-top">
      <td className="px-3 py-3 text-sm text-ink">{user.username}</td>
      <td className="px-3 py-3 text-sm text-ink">
        {mode === "edit" ? (
          <div className="flex flex-col gap-2">
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={inputClass}
              aria-label={t("fullNameLabel")}
            />
            <input
              value={contactNumber}
              onChange={(event) => setContactNumber(event.target.value)}
              className={inputClass}
              placeholder={t("contactLabel")}
              aria-label={t("contactLabel")}
            />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder={t("emailLabel")}
              aria-label={t("emailLabel")}
            />
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className={inputClass}
              placeholder={t("addressLabel")}
              aria-label={t("addressLabel")}
            />
          </div>
        ) : (
          user.full_name
        )}
      </td>
      <td className="px-3 py-3 text-sm text-ink">
        {t(
          user.role === "admin"
            ? "roleAdmin"
            : user.role === "assessor"
              ? "roleAssessor"
              : user.role === "designer"
                ? "roleDesigner"
                : "roleBhw",
        )}
      </td>
      <td className="px-3 py-3 text-sm text-ink">
        {mode === "transfer" ? (
          <div className="flex flex-col gap-2">
            <select
              value={transferTarget}
              onChange={(event) => setTransferTarget(event.target.value)}
              className={inputClass}
              aria-label={t("orgUnitLabel")}
            >
              {transferTargets.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          (user.org_units?.[0]?.name ?? "—")
        )}
      </td>
      <td className="px-3 py-3 text-sm text-ink">{t(STATUS_KEY[user.status])}</td>
      <td className="px-3 py-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {mode === "edit" ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveEdit}
                className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-on-primary disabled:opacity-60"
              >
                {t("saveAction")}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  resetEditFields();
                  setMode("view");
                  setError(null);
                }}
                className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink"
              >
                {t("cancelAction")}
              </button>
            </>
          ) : mode === "transfer" ? (
            <>
              <button
                type="button"
                disabled={loading || !transferTarget}
                onClick={handleTransfer}
                className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-on-primary disabled:opacity-60"
              >
                {t("transferSubmit")}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setMode("view");
                  setError(null);
                }}
                className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink"
              >
                {t("cancelAction")}
              </button>
            </>
          ) : mode === "anonymize-confirm" ? (
            <>
              <p role="alert" className="w-full text-xs text-danger">
                {t("anonymizeWarning")}
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={handleAnonymize}
                className="rounded-md bg-danger px-2 py-1 text-xs font-medium text-canvas disabled:opacity-60"
              >
                {t("anonymizeConfirmAction")}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setMode("view");
                  setError(null);
                }}
                className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink"
              >
                {t("cancelAction")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => setMode("edit")}
                className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5"
              >
                {t("editAction")}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleResetPassword}
                className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5"
              >
                {t("resetPasswordAction")}
              </button>
              {user.status === "active" ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSetStatus("deactivated")}
                  className="rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5"
                >
                  {t("deactivateAction")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSetStatus("active")}
                  className="rounded-md border border-success/40 px-2 py-1 text-xs font-medium text-success hover:bg-success/5"
                >
                  {t("reactivateAction")}
                </button>
              )}
              {transferTargets.length > 0 ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setMode("transfer")}
                  className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5"
                >
                  {t("transferAction")}
                </button>
              ) : null}
              <button
                type="button"
                disabled={loading}
                onClick={handleExportData}
                className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5"
              >
                {t("exportDataAction")}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setMode("anonymize-confirm")}
                className="rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5"
              >
                {t("anonymizeAction")}
              </button>
            </>
          )}
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </td>
    </tr>
  );
}

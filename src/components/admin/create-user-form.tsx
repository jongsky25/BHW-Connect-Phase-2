"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { mapAdminRpcError } from "@/lib/admin/error-messages";
import type { OrgUnitOption } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClass } from "./form-field";

type Props = {
  orgUnits: OrgUnitOption[];
  onCreated: (result: { username: string; tempPassword: string }) => void;
};

export function CreateUserForm({ orgUnits, onCreated }: Props) {
  const t = useTranslations("admin.users");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"bhw" | "admin" | "assessor" | "designer">("bhw");
  const [orgUnitId, setOrgUnitId] = useState(orgUnits[0]?.id ?? "");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("rpc_admin_create_user", {
        p_username: username.trim().toLowerCase(),
        p_full_name: fullName.trim(),
        p_role: role,
        p_org_unit_id: orgUnitId,
        p_contact_number: contactNumber.trim() || null,
        p_email: email.trim() || null,
        p_address: address.trim() || null,
      });

      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }

      const row = (data as Array<{ user_id: string; temp_password: string }> | null)?.[0];
      if (!row) {
        setError(t("genericError"));
        return;
      }

      onCreated({ username: username.trim().toLowerCase(), tempPassword: row.temp_password });
      setUsername("");
      setFullName("");
      setContactNumber("");
      setEmail("");
      setAddress("");
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-md border border-ink/10 p-4"
      noValidate
    >
      <h2 className="text-lg font-semibold text-ink">{t("createHeading")}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("usernameLabel")} htmlFor="new-username">
          <input
            id="new-username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("fullNameLabel")} htmlFor="new-full-name">
          <input
            id="new-full-name"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("roleLabel")} htmlFor="new-role">
          <select
            id="new-role"
            value={role}
            onChange={(event) => setRole(event.target.value as "bhw" | "admin" | "assessor" | "designer")}
            className={inputClass}
          >
            <option value="bhw">{t("roleBhw")}</option>
            <option value="admin">{t("roleAdmin")}</option>
            <option value="assessor">{t("roleAssessor")}</option>
            <option value="designer">{t("roleDesigner")}</option>
          </select>
        </Field>
        <Field label={t("orgUnitLabel")} htmlFor="new-org-unit">
          <select
            id="new-org-unit"
            required
            value={orgUnitId}
            onChange={(event) => setOrgUnitId(event.target.value)}
            className={inputClass}
          >
            {orgUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("contactLabel")} htmlFor="new-contact">
          <input
            id="new-contact"
            value={contactNumber}
            onChange={(event) => setContactNumber(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("emailLabel")} htmlFor="new-email">
          <input
            id="new-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("addressLabel")} htmlFor="new-address">
          <input
            id="new-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !orgUnitId}
        className="self-start rounded-md bg-primary px-4 py-2 font-medium text-on-primary transition-opacity disabled:opacity-60"
      >
        {loading ? t("creating") : t("createSubmit")}
      </button>
    </form>
  );
}

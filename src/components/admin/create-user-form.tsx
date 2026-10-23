"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { mapAdminRpcError } from "@/lib/admin/error-messages";
import { OrgUnitPicker } from "@/components/org-unit-picker";
import { ROLE_LEVELS, type OrgUnitNode } from "@/lib/org-units";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClass } from "./form-field";

type Role = "bhw" | "admin" | "assessor" | "designer";
type FormField = "username" | "fullName" | "email" | "placement";
type FieldErrors = Partial<Record<FormField, string>>;
const fieldClass = `${inputClass} aria-[invalid=true]:border-danger aria-[invalid=true]:focus:border-danger aria-[invalid=true]:focus:ring-danger/30`;
const fieldIds: Record<FormField, string> = { username: "new-username", fullName: "new-full-name", email: "new-email", placement: "new-placement" };

type Props = {
  /** The admin's own org unit: the widest place they can put a user. */
  rootOrgUnit: OrgUnitNode;
  onCreated: (result: { username: string; tempPassword: string }) => void;
};

export function CreateUserForm({ rootOrgUnit, onCreated }: Props) {
  const t = useTranslations("admin.users");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("bhw");
  const [orgUnit, setOrgUnit] = useState<OrgUnitNode>(rootOrgUnit);
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function clearFieldError(field: FormField) {
    setFieldErrors(current => ({ ...current, [field]: undefined }));
    setError(null);
  }

  function reportFieldErrors(errors: FieldErrors) {
    setFieldErrors(errors);
    setError(t("checkFieldsError"));
    const first = (Object.keys(fieldIds) as FormField[]).find(field => errors[field]);
    if (first) document.getElementById(fieldIds[first])?.focus();
  }

  // Assessors get a catchment (region / province / city-municipality); BHWs a
  // barangay, or their city-municipality to pick the barangay themselves.
  const placementValid = ROLE_LEVELS[role].includes(orgUnit.level);
  const placementHint =
    role === "assessor" ? t("assessorCatchmentHint") : role === "bhw" ? t("bhwPlacementHint") : null;
  const placementError = placementValid
    ? null
    : role === "assessor"
      ? t("catchmentNeedsLevel")
      : t("placementNeedsLevel");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const errors: FieldErrors = {};
    if (!username.trim()) errors.username = t("usernameRequiredError");
    if (!fullName.trim()) errors.fullName = t("fullNameRequiredError");
    if (email.trim() && event.currentTarget.querySelector<HTMLInputElement>("#new-email")?.validity.typeMismatch) {
      errors.email = t("emailInvalidError");
    }
    if (placementError) errors.placement = placementError;
    if (Object.keys(errors).length) { reportFieldErrors(errors); return; }
    setFieldErrors({});
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("rpc_admin_create_user", {
        p_username: username.trim().toLowerCase(),
        p_full_name: fullName.trim(),
        p_role: role,
        p_org_unit_id: orgUnit.id,
        p_contact_number: contactNumber.trim() || null,
        p_email: email.trim() || null,
        p_address: address.trim() || null,
      });

      if (rpcError) {
        const key = mapAdminRpcError(rpcError.message);
        if (key === "usernameRequiredError") reportFieldErrors({ username: t(key) });
        else if (rpcError.code === "23505" && /users_username_key|users_email_partial_key/.test(rpcError.message)) {
          reportFieldErrors({ username: t("usernameTakenError") });
        } else if (["outOfScopeError", "assessorLevelError", "bhwLevelError"].includes(key)) {
          reportFieldErrors({ placement: t(key) });
        } else setError(t(key));
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
        <Field label={t("usernameLabel")} htmlFor="new-username" error={fieldErrors.username}>
          <input
            id="new-username"
            required
            value={username}
            onChange={(event) => { setUsername(event.target.value); clearFieldError("username"); }}
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={fieldErrors.username ? "new-username-error" : undefined}
            className={fieldClass}
          />
        </Field>
        <Field label={t("fullNameLabel")} htmlFor="new-full-name" error={fieldErrors.fullName}>
          <input
            id="new-full-name"
            required
            value={fullName}
            onChange={(event) => { setFullName(event.target.value); clearFieldError("fullName"); }}
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={fieldErrors.fullName ? "new-full-name-error" : undefined}
            className={fieldClass}
          />
        </Field>
        <Field label={t("roleLabel")} htmlFor="new-role">
          <select
            id="new-role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as Role);
              setOrgUnit(rootOrgUnit);
              clearFieldError("placement");
            }}
            className={inputClass}
          >
            <option value="bhw">{t("roleBhw")}</option>
            <option value="admin">{t("roleAdmin")}</option>
            <option value="assessor">{t("roleAssessor")}</option>
            <option value="designer">{t("roleDesigner")}</option>
          </select>
        </Field>
        <fieldset id="new-placement" tabIndex={-1} aria-invalid={Boolean(fieldErrors.placement)}
          aria-describedby={fieldErrors.placement || placementError ? "new-placement-error" : undefined}
          className={`flex flex-col gap-2 sm:col-span-2 ${fieldErrors.placement ? "rounded-md border border-danger p-3 focus:outline-danger" : ""}`}>
          <legend className="text-sm font-medium text-ink">
            {role === "assessor" ? t("catchmentLabel") : t("orgUnitLabel")}
          </legend>
          {placementHint ? <p className="text-xs text-ink/70">{placementHint}</p> : null}
          <OrgUnitPicker
            key={role}
            root={rootOrgUnit}
            maxLevel={role === "assessor" ? "city_municipal" : "barangay"}
            onChange={unit => { setOrgUnit(unit); clearFieldError("placement"); }}
          />
          {fieldErrors.placement || placementError ? <p id="new-placement-error" className="text-xs text-danger">{fieldErrors.placement ?? placementError}</p> : null}
        </fieldset>
        <Field label={t("contactLabel")} htmlFor="new-contact">
          <input
            id="new-contact"
            value={contactNumber}
            onChange={(event) => setContactNumber(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("emailLabel")} htmlFor="new-email" error={fieldErrors.email}>
          <input
            id="new-email"
            type="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); clearFieldError("email"); }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "new-email-error" : undefined}
            className={fieldClass}
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
        disabled={loading}
        className="self-start rounded-md bg-primary px-4 py-2 font-medium text-on-primary transition-opacity disabled:opacity-60"
      >
        {loading ? t("creating") : t("createSubmit")}
      </button>
    </form>
  );
}

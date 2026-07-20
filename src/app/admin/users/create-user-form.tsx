"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createUser, type CreateUserState } from "./actions";

const initialState: CreateUserState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("admin");

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-canvas transition-opacity disabled:opacity-60"
    >
      {pending ? t("creating") : t("create")}
    </button>
  );
}

export function CreateUserForm({ orgUnits }: { orgUnits: { id: string; name: string }[] }) {
  const t = useTranslations("admin");
  const [state, formAction] = useActionState(createUser, initialState);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-ink/10 p-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">{t("createHeading")}</h2>
        <p className="text-sm text-ink/60">{t("createSubheading")}</p>
      </div>
      {state.result ? (
        <p className="rounded-lg bg-celebration px-3 py-2 text-sm font-medium text-celebration-ink">
          {state.result.username} — {t("tempPasswordLabel")}: <strong>{state.result.tempPassword}</strong>
          <br />
          <span className="font-normal">{t("tempPasswordHint")}</span>
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("username")}
          <input
            name="username"
            required
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("fullName")}
          <input
            name="fullName"
            required
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("role")}
          <select
            name="role"
            defaultValue="bhw"
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          >
            <option value="bhw">{t("roleBhw")}</option>
            <option value="admin">{t("roleAdmin")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("orgUnit")}
          <select
            name="orgUnitId"
            required
            defaultValue={orgUnits[0]?.id ?? ""}
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          >
            {orgUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("contactNumber")}
          <input
            name="contactNumber"
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("email")}
          <input
            name="email"
            type="email"
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink sm:col-span-2">
          {t("address")}
          <input
            name="address"
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          />
        </label>
        <div className="sm:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}

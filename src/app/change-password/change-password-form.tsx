"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changePassword, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("changePassword");

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-canvas transition-opacity disabled:opacity-60"
    >
      {pending ? t("submitting") : t("submit")}
    </button>
  );
}

export function ChangePasswordForm() {
  const t = useTranslations("changePassword");
  const [state, formAction] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {state.error ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("password")}
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("confirm")}
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
        />
      </label>
      <p className="text-sm text-ink/60">{t("hint")}</p>
      <SubmitButton />
    </form>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = {};

function ErrorMessage({ state }: { state: ChangePasswordState }) {
  const t = useTranslations("changePassword");

  switch (state.error) {
    case "mismatch":
      return <p role="alert">{t("errorMismatch")}</p>;
    case "too_short":
      return <p role="alert">{t("errorTooShort")}</p>;
    case "too_common":
      return <p role="alert">{t("errorTooCommon")}</p>;
    case "not_authenticated":
      return <p role="alert">{t("errorNotAuthenticated")}</p>;
    default:
      return null;
  }
}

export function ChangePasswordForm() {
  const t = useTranslations("changePassword");
  const [state, formAction, isPending] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="newPassword" className="text-sm font-medium text-ink">
          {t("newPasswordLabel")}
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="rounded-md border border-ink/20 bg-canvas px-3 py-2 text-ink focus:border-primary focus:outline-none"
        />
        <p className="text-xs text-ink/60">{t("hint")}</p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
          {t("confirmPasswordLabel")}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="rounded-md border border-ink/20 bg-canvas px-3 py-2 text-ink focus:border-primary focus:outline-none"
        />
      </div>
      <div className="text-sm text-danger" aria-live="polite">
        <ErrorMessage state={state} />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 font-medium text-canvas transition-opacity disabled:opacity-60"
      >
        {isPending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}

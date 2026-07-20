"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/lib/auth/actions";

const initialState: ChangePasswordState = {};

const ERROR_KEYS: Record<NonNullable<ChangePasswordState["error"]>, string> = {
  mismatch: "errorMismatch",
  too_short: "errorTooShort",
  too_common: "errorTooCommon",
  update_failed: "errorUpdateFailed",
};

export function ChangePasswordForm() {
  const t = useTranslations("changePassword");
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          {t("newPasswordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="rounded-lg border border-ink/20 bg-canvas px-4 py-3 text-base text-ink outline-none focus:border-secondary"
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
          className="rounded-lg border border-ink/20 bg-canvas px-4 py-3 text-base text-ink outline-none focus:border-secondary"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {t(ERROR_KEYS[state.error])}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-5 py-3 text-base font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { signInAction, type SignInState } from "@/lib/auth/actions";

const initialState: SignInState = {};

export function LoginForm() {
  const t = useTranslations("login");
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-ink">
          {t("usernameLabel")}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className="rounded-lg border border-ink/20 bg-canvas px-4 py-3 text-base text-ink outline-none focus:border-secondary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          {t("passwordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-ink/20 bg-canvas px-4 py-3 text-base text-ink outline-none focus:border-secondary"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {t(
            state.error === "deactivated"
              ? "errorDeactivated"
              : state.error === "locked_out"
                ? "errorLockedOut"
                : "errorInvalidCredentials",
          )}
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

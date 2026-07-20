"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

function ErrorMessage({ state }: { state: LoginState }) {
  const t = useTranslations("login");

  if (!state.error) return null;

  switch (state.error) {
    case "missingFields":
      return <p role="alert">{t("errorMissingFields")}</p>;
    case "invalidCredentials":
      return <p role="alert">{t("errorInvalidCredentials")}</p>;
    case "deactivated":
      return <p role="alert">{t("errorDeactivated")}</p>;
    case "locked":
      return <p role="alert">{t("errorLocked", { minutes: state.lockedMinutes ?? 15 })}</p>;
  }
}

export function LoginForm() {
  const t = useTranslations("login");
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
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
          className="rounded-md border border-ink/20 bg-canvas px-3 py-2 text-ink focus:border-primary focus:outline-none"
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

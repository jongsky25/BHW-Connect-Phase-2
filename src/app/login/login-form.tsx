"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("login");

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

export function LoginForm({ timedOut }: { timedOut: boolean }) {
  const t = useTranslations("login");
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {timedOut && !state.error ? (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">{t("timedOut")}</p>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error === "locked"
            ? t("errors.locked", {
                until: state.lockedUntil ? new Date(state.lockedUntil).toLocaleTimeString() : "",
              })
            : t(`errors.${state.error}`)}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("username")}
        <input
          name="username"
          type="text"
          autoComplete="username"
          required
          className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("password")}
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
        />
      </label>
      <SubmitButton />
    </form>
  );
}

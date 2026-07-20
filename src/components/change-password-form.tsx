"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { validatePassword } from "@/lib/auth/password-policy";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const t = useTranslations("changePassword");
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const policyError = validatePassword(newPassword);
    if (policyError) {
      setError(t(policyError));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("mismatch"));
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(t("genericError"));
        return;
      }

      const { error: rpcError } = await supabase.rpc("rpc_complete_password_change");
      if (rpcError) {
        setError(t("genericError"));
        return;
      }

      router.push("/home");
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <p className="mt-2 text-ink/70">{t("body")}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="newPassword" className="text-sm font-medium text-ink">
            {t("newPasswordLabel")}
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="rounded-md border border-ink/20 bg-canvas px-3 py-2 text-ink outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
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
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-md border border-ink/20 bg-canvas px-3 py-2 text-ink outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 font-medium text-canvas transition-opacity disabled:opacity-60"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}

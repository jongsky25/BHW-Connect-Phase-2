"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type LoginPrecheck = {
  auth_email: string;
  status: string;
  locked: boolean;
  locked_until: string | null;
};

type RecordAttemptResult = {
  locked: boolean;
  locked_until: string | null;
};

function minutesUntil(isoTimestamp: string): number {
  const remainingMs = new Date(isoTimestamp).getTime() - Date.now();
  return Math.max(1, Math.ceil(remainingMs / 60_000));
}

export function LoginForm() {
  const t = useTranslations("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const notice = searchParams.get("timeout")
    ? t("timeoutNotice")
    : searchParams.get("blocked")
      ? t("blockedNotice")
      : null;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const normalizedUsername = username.trim().toLowerCase();

    const { data: precheckRows } = await supabase.rpc("rpc_login_precheck", {
      p_username: normalizedUsername,
    });
    const precheck = (precheckRows as LoginPrecheck[] | null)?.[0];

    if (!precheck) {
      setError(t("invalidCredentials"));
      setLoading(false);
      return;
    }

    if (precheck.locked) {
      setError(t("lockedMessage", { minutes: minutesUntil(precheck.locked_until!) }));
      setLoading(false);
      return;
    }

    if (precheck.status !== "active") {
      setError(t("inactiveMessage"));
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: precheck.auth_email,
      password,
    });

    const { data: attemptRows } = await supabase.rpc("rpc_record_login_attempt", {
      p_username: normalizedUsername,
      p_success: !signInError,
    });

    if (signInError) {
      const attempt = (attemptRows as RecordAttemptResult[] | null)?.[0];
      if (attempt?.locked && attempt.locked_until) {
        setError(t("lockedMessage", { minutes: minutesUntil(attempt.locked_until) }));
      } else {
        setError(t("invalidCredentials"));
      }
      setLoading(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <p className="mt-2 text-ink/70">{t("body")}</p>
      </div>

      {notice ? (
        <p role="status" className="rounded-md bg-info/10 px-3 py-2 text-sm text-info">
          {notice}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="rounded-md border border-ink/20 bg-canvas px-3 py-2 text-ink outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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

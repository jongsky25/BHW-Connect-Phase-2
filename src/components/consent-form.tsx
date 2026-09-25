"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ConsentForm() {
  const t = useTranslations("consent");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAgree() {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_give_consent");

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
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <p className="mt-2 text-ink/70">{t("intro")}</p>
      </div>

      <ul className="flex flex-col gap-3 text-ink/80">
        <li>{t("bodyWhat")}</li>
        <li>{t("bodyWhy")}</li>
        <li>{t("bodyRetention")}</li>
        <li>{t("bodyRights")}</li>
      </ul>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleAgree}
        disabled={loading}
        className="self-start rounded-md bg-primary px-4 py-2 font-medium text-on-primary transition-opacity disabled:opacity-60"
      >
        {loading ? t("submitting") : t("agree")}
      </button>
    </div>
  );
}

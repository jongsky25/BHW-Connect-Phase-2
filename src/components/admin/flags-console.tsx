"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { mapAdminRpcError } from "@/lib/admin/error-messages";
import type { FeatureFlagRow } from "@/lib/flags/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialFlags: FeatureFlagRow[];
};

export function FlagsConsole({ initialFlags }: Props) {
  const t = useTranslations("admin.flags");
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(flag: FeatureFlagRow) {
    setError(null);
    setPendingKey(flag.key);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_flag_toggle", {
        p_key: flag.key,
        p_enabled: !flag.enabled,
      });

      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }

      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <p className="mt-1 text-sm text-ink/70">{t("intro")}</p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {initialFlags.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
          {initialFlags.map((flag) => (
            <li key={flag.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium text-ink">{flag.key}</p>
                <p className="text-sm text-ink/70">{flag.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={flag.enabled}
                aria-label={t("toggleLabel", { key: flag.key })}
                disabled={pendingKey === flag.key}
                onClick={() => handleToggle(flag)}
                className={`min-h-[44px] shrink-0 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60 ${
                  flag.enabled
                    ? "border border-success/40 text-success hover:bg-success/5"
                    : "border border-danger/40 text-danger hover:bg-danger/5"
                }`}
              >
                {flag.enabled ? t("enabledLabel") : t("disabledLabel")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

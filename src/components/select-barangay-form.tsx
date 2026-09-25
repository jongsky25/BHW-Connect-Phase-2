"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OrgUnitPicker } from "@/components/org-unit-picker";
import type { OrgUnitNode } from "@/lib/org-units";
import { createClient } from "@/lib/supabase/client";

export function SelectBarangayForm({ rootOrgUnit }: { rootOrgUnit: OrgUnitNode }) {
  const t = useTranslations("selectBarangay");
  const router = useRouter();
  const [selected, setSelected] = useState<OrgUnitNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const barangay = selected?.level === "barangay" ? selected : null;

  async function handleSubmit() {
    if (!barangay) return;
    setError(null);
    setLoading(true);
    try {
      const { error: rpcError } = await createClient().rpc("rpc_bhw_select_barangay", {
        p_org_unit_id: barangay.id,
      });
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

      <div className="max-w-md">
        <OrgUnitPicker root={rootOrgUnit} allowRoot={false} onChange={setSelected} disabled={loading} />
      </div>

      {barangay ? <p className="text-sm text-ink/80">{t("confirm", { name: barangay.name })}</p> : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !barangay}
        className="self-start rounded-md bg-primary px-4 py-2 font-medium text-on-primary transition-opacity disabled:opacity-60"
      >
        {loading ? t("submitting") : t("submit")}
      </button>
    </div>
  );
}

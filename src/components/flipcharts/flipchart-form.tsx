"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/admin/form-field";
import { mapFlipchartRpcError } from "@/lib/flipcharts/error-messages";
import { emptyDraftPage, type DraftFlipChartPage, type FlipChart, type FlipChartStatus } from "@/lib/flipcharts/types";
import { createClient } from "@/lib/supabase/client";
import { PageBuilder } from "./page-builder";

type Props = {
  namespace: "admin.flipcharts" | "designer.flipcharts";
  authorFullName: string;
  authorUsername: string;
  authorUserId: string;
  createdStatus: FlipChartStatus;
  onCreated: (chart: FlipChart) => void;
};

export function FlipchartForm({ namespace, authorFullName, authorUsername, authorUserId, createdStatus, onCreated }: Props) {
  const t = useTranslations(namespace);
  const [titleFil, setTitleFil] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [pages, setPages] = useState<DraftFlipChartPage[]>([emptyDraftPage()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const payload = pages.map((p) => ({
        client_image_url: p.client_image_url,
        client_caption_fil: p.client_caption_fil.trim(),
        client_caption_en: p.client_caption_en.trim(),
        script_fil: p.script_fil.trim(),
        script_en: p.script_en.trim(),
      }));

      const { data, error: rpcError } = await supabase.rpc("rpc_flipchart_create", {
        p_title_fil: titleFil.trim(),
        p_title_en: titleEn.trim(),
        p_pages: payload,
      });

      if (rpcError) {
        setError(t(mapFlipchartRpcError(rpcError.message)));
        return;
      }

      const row = (data as Array<{ flip_chart_id: string }> | null)?.[0];
      if (!row) {
        setError(t("genericError"));
        return;
      }

      onCreated({
        id: row.flip_chart_id,
        author_user_id: authorUserId,
        author_full_name: authorFullName,
        author_username: authorUsername,
        title_fil: titleFil.trim(),
        title_en: titleEn.trim(),
        status: createdStatus,
        review_note: null,
        created_at: new Date().toISOString(),
      });

      setTitleFil("");
      setTitleEn("");
      setPages([emptyDraftPage()]);
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-ink/10 p-4" noValidate>
      <h2 className="text-lg font-semibold text-ink">{t("createHeading")}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("titleFilLabel")} htmlFor="flipchart-title-fil">
          <input
            id="flipchart-title-fil"
            required
            value={titleFil}
            onChange={(event) => setTitleFil(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("titleEnLabel")} htmlFor="flipchart-title-en">
          <input
            id="flipchart-title-en"
            required
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <PageBuilder pages={pages} onChange={setPages} />

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-primary px-6 py-3 font-medium text-on-primary disabled:opacity-60"
      >
        {loading ? t("creating") : t("createAction")}
      </button>
    </form>
  );
}

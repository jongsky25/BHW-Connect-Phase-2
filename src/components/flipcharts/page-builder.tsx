"use client";

import { useTranslations } from "next-intl";
import { Field, inputClass } from "@/components/admin/form-field";
import { emptyDraftPage, type DraftFlipChartPage } from "@/lib/flipcharts/types";
import { ImageUpload } from "./image-upload";

type Props = {
  pages: DraftFlipChartPage[];
  onChange: (pages: DraftFlipChartPage[]) => void;
};

export function PageBuilder({ pages, onChange }: Props) {
  const t = useTranslations("flipchartPages");

  function updatePage(index: number, patch: Partial<DraftFlipChartPage>) {
    onChange(pages.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-ink">{t("pagesHeading")}</h3>
      {pages.map((page, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-md border border-ink/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            {t("pageNumber", { number: index + 1 })}
          </p>

          <Field label={t("clientImageLabel")} htmlFor={`page-image-${index}`}>
            <ImageUpload
              imageUrl={page.client_image_url}
              onChange={(url) => updatePage(index, { client_image_url: url })}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("clientCaptionFilLabel")} htmlFor={`page-caption-fil-${index}`}>
              <input
                id={`page-caption-fil-${index}`}
                value={page.client_caption_fil}
                onChange={(event) => updatePage(index, { client_caption_fil: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label={t("clientCaptionEnLabel")} htmlFor={`page-caption-en-${index}`}>
              <input
                id={`page-caption-en-${index}`}
                value={page.client_caption_en}
                onChange={(event) => updatePage(index, { client_caption_en: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label={t("scriptFilLabel")} htmlFor={`page-script-fil-${index}`}>
              <textarea
                id={`page-script-fil-${index}`}
                rows={3}
                required
                value={page.script_fil}
                onChange={(event) => updatePage(index, { script_fil: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label={t("scriptEnLabel")} htmlFor={`page-script-en-${index}`}>
              <textarea
                id={`page-script-en-${index}`}
                rows={3}
                required
                value={page.script_en}
                onChange={(event) => updatePage(index, { script_en: event.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          {pages.length > 1 ? (
            <button
              type="button"
              onClick={() => onChange(pages.filter((_, i) => i !== index))}
              className="self-start text-sm font-medium text-danger underline"
            >
              {t("removePageAction")}
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...pages, emptyDraftPage()])}
        className="self-start rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
      >
        {t("addPageAction")}
      </button>
    </div>
  );
}

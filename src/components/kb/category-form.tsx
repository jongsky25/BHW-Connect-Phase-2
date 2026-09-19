"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import type { KbCategory } from "@/lib/kb/types";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClass } from "@/components/admin/form-field";

type Props = {
  onCreated: (category: KbCategory) => void;
};

export function CategoryForm({ onCreated }: Props) {
  const t = useTranslations("admin.kbCategories");
  const [nameFil, setNameFil] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("kb_categories")
        .insert({
          name_fil: nameFil.trim(),
          name_en: nameEn.trim(),
          slug: slug.trim().toLowerCase(),
          sort_order: Number(sortOrder) || 0,
        })
        .select("id, name_fil, name_en, slug, sort_order")
        .single();

      if (insertError || !data) {
        setError(t("genericError"));
        return;
      }

      onCreated(data as KbCategory);
      setNameFil("");
      setNameEn("");
      setSlug("");
      setSortOrder("0");
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-md border border-ink/10 p-4"
      noValidate
    >
      <h2 className="text-lg font-semibold text-ink">{t("createHeading")}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("nameFilLabel")} htmlFor="new-category-name-fil">
          <input
            id="new-category-name-fil"
            required
            value={nameFil}
            onChange={(event) => setNameFil(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("nameEnLabel")} htmlFor="new-category-name-en">
          <input
            id="new-category-name-en"
            required
            value={nameEn}
            onChange={(event) => setNameEn(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("slugLabel")} htmlFor="new-category-slug">
          <input
            id="new-category-slug"
            required
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("sortOrderLabel")} htmlFor="new-category-sort-order">
          <input
            id="new-category-sort-order"
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-primary px-4 py-2 font-medium text-on-primary transition-opacity disabled:opacity-60"
      >
        {loading ? t("creating") : t("createSubmit")}
      </button>
    </form>
  );
}

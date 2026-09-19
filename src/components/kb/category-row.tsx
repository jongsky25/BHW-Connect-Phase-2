"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { KbCategory } from "@/lib/kb/types";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/admin/form-field";

type Props = {
  category: KbCategory;
  onChanged: (updated: KbCategory) => void;
  onDeleted: (id: string) => void;
};

export function CategoryRow({ category, onChanged, onDeleted }: Props) {
  const t = useTranslations("admin.kbCategories");
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nameFil, setNameFil] = useState(category.name_fil);
  const [nameEn, setNameEn] = useState(category.name_en);
  const [slug, setSlug] = useState(category.slug);
  const [sortOrder, setSortOrder] = useState(String(category.sort_order));

  function resetFields() {
    setNameFil(category.name_fil);
    setNameEn(category.name_en);
    setSlug(category.slug);
    setSortOrder(String(category.sort_order));
  }

  async function handleSave() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("kb_categories")
        .update({
          name_fil: nameFil.trim(),
          name_en: nameEn.trim(),
          slug: slug.trim().toLowerCase(),
          sort_order: Number(sortOrder) || 0,
        })
        .eq("id", category.id)
        .select("id, name_fil, name_en, slug, sort_order")
        .single();

      if (updateError || !data) {
        setError(t("genericError"));
        return;
      }

      onChanged(data as KbCategory);
      setMode("view");
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("kb_categories").delete().eq("id", category.id);

      if (deleteError) {
        setError(t("deleteInUseError"));
        setMode("view");
        return;
      }

      onDeleted(category.id);
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="border-b border-ink/10 align-top">
      <td className="px-3 py-3 text-sm text-ink">
        {mode === "edit" ? (
          <input
            value={nameFil}
            onChange={(event) => setNameFil(event.target.value)}
            className={inputClass}
            aria-label={t("nameFilLabel")}
          />
        ) : (
          category.name_fil
        )}
      </td>
      <td className="px-3 py-3 text-sm text-ink">
        {mode === "edit" ? (
          <input
            value={nameEn}
            onChange={(event) => setNameEn(event.target.value)}
            className={inputClass}
            aria-label={t("nameEnLabel")}
          />
        ) : (
          category.name_en
        )}
      </td>
      <td className="px-3 py-3 text-sm text-ink">
        {mode === "edit" ? (
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className={inputClass}
            aria-label={t("slugLabel")}
          />
        ) : (
          category.slug
        )}
      </td>
      <td className="px-3 py-3 text-sm text-ink">
        {mode === "edit" ? (
          <input
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className={inputClass}
            aria-label={t("sortOrderLabel")}
          />
        ) : (
          category.sort_order
        )}
      </td>
      <td className="px-3 py-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {mode === "edit" ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={handleSave}
                className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-on-primary disabled:opacity-60"
              >
                {t("saveAction")}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  resetFields();
                  setMode("view");
                  setError(null);
                }}
                className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink"
              >
                {t("cancelAction")}
              </button>
            </>
          ) : mode === "confirmDelete" ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={handleDelete}
                className="rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5"
              >
                {t("confirmDeleteAction")}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setMode("view")}
                className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink"
              >
                {t("cancelAction")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => setMode("edit")}
                className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5"
              >
                {t("editAction")}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setMode("confirmDelete")}
                className="rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5"
              >
                {t("deleteAction")}
              </button>
            </>
          )}
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </td>
    </tr>
  );
}

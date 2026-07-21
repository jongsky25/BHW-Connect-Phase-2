"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Synonym } from "@/lib/kb/types";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/admin/form-field";

type Props = {
  synonym: Synonym;
  onChanged: (updated: Synonym) => void;
  onDeleted: (id: string) => void;
};

const LANGUAGE_KEY: Record<Synonym["language"], string> = {
  fil: "languageFil",
  en: "languageEn",
  taglish: "languageTaglish",
};

export function SynonymRow({ synonym, onChanged, onDeleted }: Props) {
  const t = useTranslations("admin.kbSynonyms");
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [term, setTerm] = useState(synonym.term);
  const [mapsTo, setMapsTo] = useState(synonym.maps_to);
  const [language, setLanguage] = useState(synonym.language);

  function resetFields() {
    setTerm(synonym.term);
    setMapsTo(synonym.maps_to);
    setLanguage(synonym.language);
  }

  async function handleSave() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("synonyms")
        .update({ term: term.trim().toLowerCase(), maps_to: mapsTo.trim().toLowerCase(), language })
        .eq("id", synonym.id)
        .select("id, term, maps_to, language")
        .single();

      if (updateError || !data) {
        setError(t("genericError"));
        return;
      }

      onChanged(data as Synonym);
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
      const { error: deleteError } = await supabase.from("synonyms").delete().eq("id", synonym.id);

      if (deleteError) {
        setError(t("genericError"));
        setMode("view");
        return;
      }

      onDeleted(synonym.id);
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
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            className={inputClass}
            aria-label={t("termLabel")}
          />
        ) : (
          synonym.term
        )}
      </td>
      <td className="px-3 py-3 text-sm text-ink">
        {mode === "edit" ? (
          <input
            value={mapsTo}
            onChange={(event) => setMapsTo(event.target.value)}
            className={inputClass}
            aria-label={t("mapsToLabel")}
          />
        ) : (
          synonym.maps_to
        )}
      </td>
      <td className="px-3 py-3 text-sm text-ink">
        {mode === "edit" ? (
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Synonym["language"])}
            className={inputClass}
            aria-label={t("languageLabel")}
          >
            <option value="fil">{t("languageFil")}</option>
            <option value="en">{t("languageEn")}</option>
            <option value="taglish">{t("languageTaglish")}</option>
          </select>
        ) : (
          t(LANGUAGE_KEY[synonym.language])
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
                className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-canvas disabled:opacity-60"
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

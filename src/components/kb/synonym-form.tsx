"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import type { Synonym } from "@/lib/kb/types";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClass } from "@/components/admin/form-field";

type Props = {
  onCreated: (synonym: Synonym) => void;
};

export function SynonymForm({ onCreated }: Props) {
  const t = useTranslations("admin.kbSynonyms");
  const [term, setTerm] = useState("");
  const [mapsTo, setMapsTo] = useState("");
  const [language, setLanguage] = useState<Synonym["language"]>("taglish");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("synonyms")
        .insert({ term: term.trim().toLowerCase(), maps_to: mapsTo.trim().toLowerCase(), language })
        .select("id, term, maps_to, language")
        .single();

      if (insertError || !data) {
        setError(t("genericError"));
        return;
      }

      onCreated(data as Synonym);
      setTerm("");
      setMapsTo("");
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("termLabel")} htmlFor="new-synonym-term">
          <input
            id="new-synonym-term"
            required
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("mapsToLabel")} htmlFor="new-synonym-maps-to">
          <input
            id="new-synonym-maps-to"
            required
            value={mapsTo}
            onChange={(event) => setMapsTo(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("languageLabel")} htmlFor="new-synonym-language">
          <select
            id="new-synonym-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Synonym["language"])}
            className={inputClass}
          >
            <option value="fil">{t("languageFil")}</option>
            <option value="en">{t("languageEn")}</option>
            <option value="taglish">{t("languageTaglish")}</option>
          </select>
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

"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createSynonym, type SynonymActionState } from "./actions";

const initialState: SynonymActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("kb");
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-canvas disabled:opacity-60"
    >
      {t("addSynonym")}
    </button>
  );
}

export function SynonymForm() {
  const t = useTranslations("kb");
  const [state, formAction] = useActionState(createSynonym, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-ink/10 p-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("term")}
        <input name="term" required className="w-40 rounded-lg border border-ink/15 bg-canvas px-2 py-1.5 text-sm text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("mapsTo")}
        <input name="mapsTo" required className="w-40 rounded-lg border border-ink/15 bg-canvas px-2 py-1.5 text-sm text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("language")}
        <select name="language" defaultValue="taglish" className="rounded-lg border border-ink/15 bg-canvas px-2 py-1.5 text-sm text-ink">
          <option value="fil">{t("languageFil")}</option>
          <option value="en">{t("languageEn")}</option>
          <option value="taglish">{t("languageTaglish")}</option>
        </select>
      </label>
      <SubmitButton />
      {state.error ? <span className="text-sm text-danger">{t(`errors.${state.error}`)}</span> : null}
    </form>
  );
}

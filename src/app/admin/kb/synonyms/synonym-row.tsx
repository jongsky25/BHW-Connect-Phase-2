"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteSynonym, type SynonymActionState } from "./actions";

const initialState: SynonymActionState = {};

function DeleteButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("kb");
  return (
    <button type="submit" disabled={pending} className="text-sm text-danger hover:underline disabled:opacity-60">
      {t("delete")}
    </button>
  );
}

const LANGUAGE_KEY = {
  fil: "languageFil",
  en: "languageEn",
  taglish: "languageTaglish",
} as const;

export function SynonymRow({
  synonym,
}: {
  synonym: { id: string; term: string; maps_to: string; language: "fil" | "en" | "taglish" };
}) {
  const t = useTranslations("kb");
  const [, deleteAction] = useActionState(deleteSynonym, initialState);

  return (
    <tr className="border-b border-ink/5">
      <td className="py-2 pr-4 text-ink">{synonym.term}</td>
      <td className="py-2 pr-4 text-ink/70">{synonym.maps_to}</td>
      <td className="py-2 pr-4 text-ink/70">{t(LANGUAGE_KEY[synonym.language])}</td>
      <td className="py-2 pr-4">
        <form action={deleteAction}>
          <input type="hidden" name="id" value={synonym.id} />
          <DeleteButton />
        </form>
      </td>
    </tr>
  );
}

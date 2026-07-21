"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Synonym } from "@/lib/kb/types";
import { SynonymForm } from "./synonym-form";
import { SynonymRow } from "./synonym-row";

type Props = {
  initialSynonyms: Synonym[];
};

export function SynonymsConsole({ initialSynonyms }: Props) {
  const t = useTranslations("admin.kbSynonyms");
  const [synonyms, setSynonyms] = useState(initialSynonyms);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>

      <SynonymForm onCreated={(synonym) => setSynonyms((prev) => [synonym, ...prev])} />

      {synonyms.length === 0 ? (
        <p className="text-ink/70">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-ink/10">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead className="bg-ink/5">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("termLabel")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("mapsToLabel")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("languageLabel")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {synonyms.map((synonym) => (
                <SynonymRow
                  key={synonym.id}
                  synonym={synonym}
                  onChanged={(updated) =>
                    setSynonyms((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
                  }
                  onDeleted={(id) => setSynonyms((prev) => prev.filter((item) => item.id !== id))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

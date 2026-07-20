import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { KbNav } from "../kb-nav";
import { SynonymForm } from "./synonym-form";
import { SynonymRow } from "./synonym-row";

interface Synonym {
  id: string;
  term: string;
  maps_to: string;
  language: "fil" | "en" | "taglish";
}

export default async function AdminKbSynonymsPage() {
  const t = await getTranslations("kb");
  const supabase = await createClient();

  const { data: synonyms } = await supabase
    .from("synonyms")
    .select("id, term, maps_to, language")
    .order("term")
    .returns<Synonym[]>();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("synonymsHeading")}</h1>
      <KbNav />

      <SynonymForm />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-ink/60">
              <th className="py-2 pr-4 font-medium">{t("term")}</th>
              <th className="py-2 pr-4 font-medium">{t("mapsTo")}</th>
              <th className="py-2 pr-4 font-medium">{t("language")}</th>
              <th className="py-2 pr-4 font-medium">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {!synonyms || synonyms.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-ink/60">
                  {t("noSynonyms")}
                </td>
              </tr>
            ) : (
              synonyms.map((synonym) => <SynonymRow key={synonym.id} synonym={synonym} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { SynonymsConsole } from "@/components/kb/synonyms-console";
import { createClient } from "@/lib/supabase/server";

export default async function AdminKbSynonymsPage() {
  const supabase = await createClient();

  const { data: synonyms } = await supabase
    .from("synonyms")
    .select("id, term, maps_to, language")
    .order("term");

  return <SynonymsConsole initialSynonyms={synonyms ?? []} />;
}

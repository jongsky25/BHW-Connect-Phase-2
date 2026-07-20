"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SynonymActionState {
  error?: "unknown";
}

export async function createSynonym(
  _prevState: SynonymActionState,
  formData: FormData,
): Promise<SynonymActionState> {
  const term = String(formData.get("term") ?? "").trim();
  const mapsTo = String(formData.get("mapsTo") ?? "").trim();
  const language = String(formData.get("language") ?? "fil");

  if (!term || !mapsTo) {
    return { error: "unknown" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("synonyms").insert({ term, maps_to: mapsTo, language });

  if (error) {
    return { error: "unknown" };
  }

  revalidatePath("/admin/kb/synonyms");
  return {};
}

export async function deleteSynonym(
  _prevState: SynonymActionState,
  formData: FormData,
): Promise<SynonymActionState> {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.from("synonyms").delete().eq("id", id);

  if (error) {
    return { error: "unknown" };
  }

  revalidatePath("/admin/kb/synonyms");
  return {};
}

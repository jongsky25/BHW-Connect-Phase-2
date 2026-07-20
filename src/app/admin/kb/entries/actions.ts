"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface EntryActionState {
  error?: "ownerRequiredToPublish" | "unknown";
}

export async function createEntry(
  _prevState: EntryActionState,
  formData: FormData,
): Promise<EntryActionState> {
  const categoryId = String(formData.get("categoryId") ?? "");
  const questionFil = String(formData.get("questionFil") ?? "").trim();
  const questionEn = String(formData.get("questionEn") ?? "").trim();
  const answerFil = String(formData.get("answerFil") ?? "").trim();
  const answerEn = String(formData.get("answerEn") ?? "").trim();
  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const imageUrl = String(formData.get("imageUrl") ?? "") || null;
  const ownerUserId = String(formData.get("ownerUserId") ?? "") || null;
  const reviewDueOn = String(formData.get("reviewDueOn") ?? "") || null;
  const status = String(formData.get("status") ?? "draft");

  if (!categoryId || !questionFil || !questionEn || !answerFil || !answerEn) {
    return { error: "unknown" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("kb_entries").insert({
    category_id: categoryId,
    question_fil: questionFil,
    question_en: questionEn,
    answer_fil: answerFil,
    answer_en: answerEn,
    keywords,
    image_url: imageUrl,
    owner_user_id: ownerUserId,
    review_due_on: reviewDueOn,
    status,
  });

  if (error) {
    return { error: error.code === "23514" ? "ownerRequiredToPublish" : "unknown" };
  }

  revalidatePath("/admin/kb/entries");
  return {};
}

export async function setEntryStatus(
  _prevState: EntryActionState,
  formData: FormData,
): Promise<EntryActionState> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.from("kb_entries").update({ status }).eq("id", id);

  if (error) {
    return { error: error.code === "23514" ? "ownerRequiredToPublish" : "unknown" };
  }

  revalidatePath("/admin/kb/entries");
  return {};
}

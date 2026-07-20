"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ArticleActionState {
  error?: "ownerRequiredToPublish" | "unknown";
}

function parseJsonField(raw: FormDataEntryValue | null): object {
  if (typeof raw !== "string" || !raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function createArticle(
  _prevState: ArticleActionState,
  formData: FormData,
): Promise<ArticleActionState> {
  const categoryId = String(formData.get("categoryId") ?? "");
  const titleFil = String(formData.get("titleFil") ?? "").trim();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const bodyFil = parseJsonField(formData.get("bodyFil"));
  const bodyEn = parseJsonField(formData.get("bodyEn"));
  const ownerUserId = String(formData.get("ownerUserId") ?? "") || null;
  const reviewDueOn = String(formData.get("reviewDueOn") ?? "") || null;
  const status = String(formData.get("status") ?? "draft");

  if (!categoryId || !titleFil || !titleEn) {
    return { error: "unknown" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("kb_articles").insert({
    category_id: categoryId,
    title_fil: titleFil,
    title_en: titleEn,
    body_fil: bodyFil,
    body_en: bodyEn,
    owner_user_id: ownerUserId,
    review_due_on: reviewDueOn,
    status,
  });

  if (error) {
    return { error: error.code === "23514" ? "ownerRequiredToPublish" : "unknown" };
  }

  revalidatePath("/admin/kb/articles");
  return {};
}

export async function setArticleStatus(
  _prevState: ArticleActionState,
  formData: FormData,
): Promise<ArticleActionState> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.from("kb_articles").update({ status }).eq("id", id);

  if (error) {
    return { error: error.code === "23514" ? "ownerRequiredToPublish" : "unknown" };
  }

  revalidatePath("/admin/kb/articles");
  return {};
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CategoryActionState {
  error?: "slugTaken" | "inUse" | "unknown";
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const nameFil = String(formData.get("nameFil") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!nameFil || !nameEn) {
    return { error: "unknown" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("kb_categories").insert({
    name_fil: nameFil,
    name_en: nameEn,
    slug: slugify(slugInput || nameEn),
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  });

  if (error) {
    return { error: error.code === "23505" ? "slugTaken" : "unknown" };
  }

  revalidatePath("/admin/kb/categories");
  return {};
}

export async function updateCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = String(formData.get("id") ?? "");
  const nameFil = String(formData.get("nameFil") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  const supabase = await createClient();
  const { error } = await supabase
    .from("kb_categories")
    .update({
      name_fil: nameFil,
      name_en: nameEn,
      slug: slugify(slugInput || nameEn),
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    })
    .eq("id", id);

  if (error) {
    return { error: error.code === "23505" ? "slugTaken" : "unknown" };
  }

  revalidatePath("/admin/kb/categories");
  return {};
}

export async function deleteCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.from("kb_categories").delete().eq("id", id);

  if (error) {
    return { error: error.code === "23503" ? "inUse" : "unknown" };
  }

  revalidatePath("/admin/kb/categories");
  return {};
}

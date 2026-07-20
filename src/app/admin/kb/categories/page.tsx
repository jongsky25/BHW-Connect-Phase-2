import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { KbNav } from "../kb-nav";
import { CategoryRow } from "./category-row";
import { CreateCategoryForm } from "./create-category-form";

interface Category {
  id: string;
  name_fil: string;
  name_en: string;
  slug: string;
  sort_order: number;
}

export default async function AdminKbCategoriesPage() {
  const t = await getTranslations("kb");
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("kb_categories")
    .select("id, name_fil, name_en, slug, sort_order")
    .order("sort_order")
    .returns<Category[]>();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("categoriesHeading")}</h1>
      <KbNav />

      <CreateCategoryForm />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-ink/60">
              <th className="py-2 pr-4 font-medium">{t("nameFil")}</th>
              <th className="py-2 pr-4 font-medium">{t("nameEn")}</th>
              <th className="py-2 pr-4 font-medium">{t("slug")}</th>
              <th className="py-2 pr-4 font-medium">{t("sortOrder")}</th>
              <th className="py-2 pr-4 font-medium">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {!categories || categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-ink/60">
                  {t("noCategories")}
                </td>
              </tr>
            ) : (
              categories.map((category) => <CategoryRow key={category.id} category={category} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

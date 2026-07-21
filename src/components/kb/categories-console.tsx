"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { KbCategory } from "@/lib/kb/types";
import { CategoryForm } from "./category-form";
import { CategoryRow } from "./category-row";

type Props = {
  initialCategories: KbCategory[];
};

export function CategoriesConsole({ initialCategories }: Props) {
  const t = useTranslations("admin.kbCategories");
  const [categories, setCategories] = useState(initialCategories);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>

      <CategoryForm
        onCreated={(category) =>
          setCategories((prev) => [...prev, category].sort((a, b) => a.sort_order - b.sort_order))
        }
      />

      {categories.length === 0 ? (
        <p className="text-ink/70">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-ink/10">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead className="bg-ink/5">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("nameFilLabel")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("nameEnLabel")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("slugLabel")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("sortOrderLabel")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  onChanged={(updated) =>
                    setCategories((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
                  }
                  onDeleted={(id) => setCategories((prev) => prev.filter((item) => item.id !== id))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/admin/form-field";
import { mapForumRpcError } from "@/lib/forum/error-messages";
import type { ForumCategory } from "@/lib/forum/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  onCreated: (category: ForumCategory) => void;
};

export function CategoryForm({ onCreated }: Props) {
  const t = useTranslations("admin.forum");
  const [slug, setSlug] = useState("");
  const [nameFil, setNameFil] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionFil, setDescriptionFil] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("rpc_forum_category_create", {
        p_slug: slug.trim(),
        p_name_fil: nameFil.trim(),
        p_name_en: nameEn.trim(),
        p_description_fil: descriptionFil.trim(),
        p_description_en: descriptionEn.trim(),
        p_sort_order: 0,
      });

      if (rpcError) {
        setError(t(mapForumRpcError(rpcError.message)));
        return;
      }

      const categoryId = (data as Array<{ category_id: string }>)[0]?.category_id;
      if (categoryId) {
        onCreated({
          id: categoryId,
          slug: slug.trim(),
          name_fil: nameFil.trim(),
          name_en: nameEn.trim(),
          description_fil: descriptionFil.trim(),
          description_en: descriptionEn.trim(),
          sort_order: 0,
        });
      }

      setSlug("");
      setNameFil("");
      setNameEn("");
      setDescriptionFil("");
      setDescriptionEn("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-ink/10 p-4">
      <h2 className="text-lg font-semibold text-ink">{t("createCategoryHeading")}</h2>

      <Field label={t("slugLabel")} htmlFor="forum-category-slug">
        <input
          id="forum-category-slug"
          className={inputClass}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("nameFilLabel")} htmlFor="forum-category-name-fil">
          <input
            id="forum-category-name-fil"
            className={inputClass}
            value={nameFil}
            onChange={(e) => setNameFil(e.target.value)}
            required
          />
        </Field>
        <Field label={t("nameEnLabel")} htmlFor="forum-category-name-en">
          <input
            id="forum-category-name-en"
            className={inputClass}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("descriptionFilLabel")} htmlFor="forum-category-description-fil">
          <input
            id="forum-category-description-fil"
            className={inputClass}
            value={descriptionFil}
            onChange={(e) => setDescriptionFil(e.target.value)}
          />
        </Field>
        <Field label={t("descriptionEnLabel")} htmlFor="forum-category-description-en">
          <input
            id="forum-category-description-en"
            className={inputClass}
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
          />
        </Field>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
      >
        {loading ? t("creating") : t("createCategoryAction")}
      </button>
    </form>
  );
}

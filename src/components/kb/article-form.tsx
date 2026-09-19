"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mapKbRpcError } from "@/lib/kb/error-messages";
import type { KbArticle, KbCategory, KbStatus, OwnerOption } from "@/lib/kb/types";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClass } from "@/components/admin/form-field";
import { RichTextEditor } from "./rich-text-editor";

type Props = {
  mode: "create" | "edit";
  article?: KbArticle;
  categories: KbCategory[];
  owners: OwnerOption[];
};

function defaultReviewDueOn(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().slice(0, 10);
}

export function ArticleForm({ mode, article, categories, owners }: Props) {
  const t = useTranslations("admin.kbArticles");
  const router = useRouter();

  const [categoryId, setCategoryId] = useState(article?.category_id ?? categories[0]?.id ?? "");
  const [titleFil, setTitleFil] = useState(article?.title_fil ?? "");
  const [titleEn, setTitleEn] = useState(article?.title_en ?? "");
  const [bodyFil, setBodyFil] = useState<object>(article?.body_fil ?? {});
  const [bodyEn, setBodyEn] = useState<object>(article?.body_en ?? {});
  const [ownerUserId, setOwnerUserId] = useState(article?.owner_user_id ?? "");
  const [reviewDueOn, setReviewDueOn] = useState(article?.review_due_on ?? defaultReviewDueOn());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(status: KbStatus) {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "create") {
        const { error: rpcError } = await supabase.rpc("rpc_kb_article_create", {
          p_category_id: categoryId,
          p_title_fil: titleFil.trim(),
          p_title_en: titleEn.trim(),
          p_body_fil: bodyFil,
          p_body_en: bodyEn,
          p_owner_user_id: ownerUserId || null,
          p_review_due_on: reviewDueOn || null,
          p_status: status,
        });

        if (rpcError) {
          setError(t(mapKbRpcError(rpcError.message)));
          return;
        }
      } else if (article) {
        const { error: rpcError } = await supabase.rpc("rpc_kb_article_update", {
          p_id: article.id,
          p_category_id: categoryId,
          p_title_fil: titleFil.trim(),
          p_title_en: titleEn.trim(),
          p_body_fil: bodyFil,
          p_body_en: bodyEn,
          p_owner_user_id: ownerUserId || null,
          p_review_due_on: reviewDueOn || null,
          p_status: status,
        });

        if (rpcError) {
          setError(t(mapKbRpcError(rpcError.message)));
          return;
        }
      }

      router.push("/admin/kb/articles");
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSave("draft");
      }}
      className="flex flex-col gap-4 rounded-md border border-ink/10 p-4"
      noValidate
    >
      <Field label={t("categoryLabel")} htmlFor="article-category">
        <select
          id="article-category"
          required
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className={inputClass}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name_en}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("titleFilLabel")} htmlFor="article-title-fil">
          <input
            id="article-title-fil"
            required
            value={titleFil}
            onChange={(event) => setTitleFil(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("titleEnLabel")} htmlFor="article-title-en">
          <input
            id="article-title-en"
            required
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("bodyFilLabel")} htmlFor="article-body-fil">
          <RichTextEditor content={bodyFil} onChange={setBodyFil} ariaLabel={t("bodyFilLabel")} />
        </Field>
        <Field label={t("bodyEnLabel")} htmlFor="article-body-en">
          <RichTextEditor content={bodyEn} onChange={setBodyEn} ariaLabel={t("bodyEnLabel")} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("ownerLabel")} htmlFor="article-owner">
          <select
            id="article-owner"
            value={ownerUserId}
            onChange={(event) => setOwnerUserId(event.target.value)}
            className={inputClass}
          >
            <option value="">{t("ownerNone")}</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.full_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("reviewDueLabel")} htmlFor="article-review-due">
          <input
            id="article-review-due"
            type="date"
            value={reviewDueOn}
            onChange={(event) => setReviewDueOn(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {article ? (
        <p className="text-sm text-ink/70">
          {t("currentStatus")}: {t(article.status === "published" ? "statusPublished" : "statusDraft")}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink transition-opacity disabled:opacity-60"
        >
          {loading ? t("saving") : t("saveDraftAction")}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSave("published")}
          className="rounded-md bg-primary px-4 py-2 font-medium text-on-primary transition-opacity disabled:opacity-60"
        >
          {loading ? t("saving") : t("publishAction")}
        </button>
      </div>
    </form>
  );
}

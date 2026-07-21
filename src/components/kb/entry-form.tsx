"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { mapKbRpcError } from "@/lib/kb/error-messages";
import type { KbCategory, KbEntry, KbStatus, OwnerOption } from "@/lib/kb/types";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClass } from "@/components/admin/form-field";
import { ImageUpload } from "./image-upload";

type Props = {
  mode: "create" | "edit";
  entry?: KbEntry;
  categories: KbCategory[];
  owners: OwnerOption[];
  prefill?: { sourceUnmatchedQuestionId: string; text: string };
};

function defaultReviewDueOn(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().slice(0, 10);
}

export function EntryForm({ mode, entry, categories, owners, prefill }: Props) {
  const t = useTranslations("admin.kbEntries");
  const router = useRouter();
  // Read the source gap id straight from the current URL rather than only
  // trusting the server-passed `prefill` prop: it's the more direct source
  // of truth for what the admin actually navigated here to resolve, and
  // avoids depending on that prop surviving unchanged through to submit.
  const searchParams = useSearchParams();
  const sourceUnmatchedQuestionId = searchParams.get("fromUnmatched") ?? prefill?.sourceUnmatchedQuestionId ?? null;

  const [categoryId, setCategoryId] = useState(entry?.category_id ?? categories[0]?.id ?? "");
  const [questionFil, setQuestionFil] = useState(entry?.question_fil ?? prefill?.text ?? "");
  const [questionEn, setQuestionEn] = useState(entry?.question_en ?? prefill?.text ?? "");
  const [answerFil, setAnswerFil] = useState(entry?.answer_fil ?? "");
  const [answerEn, setAnswerEn] = useState(entry?.answer_en ?? "");
  const [keywords, setKeywords] = useState(entry?.keywords.join(", ") ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(entry?.image_url ?? null);
  const [ownerUserId, setOwnerUserId] = useState(entry?.owner_user_id ?? "");
  const [reviewDueOn, setReviewDueOn] = useState(entry?.review_due_on ?? defaultReviewDueOn());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(status: KbStatus) {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const keywordList = keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean);

      if (mode === "create") {
        const { error: rpcError } = await supabase.rpc("rpc_kb_entry_create", {
          p_category_id: categoryId,
          p_question_fil: questionFil.trim(),
          p_question_en: questionEn.trim(),
          p_answer_fil: answerFil.trim(),
          p_answer_en: answerEn.trim(),
          p_keywords: keywordList,
          p_image_url: imageUrl,
          p_owner_user_id: ownerUserId || null,
          p_review_due_on: reviewDueOn || null,
          p_status: status,
          p_source_unmatched_question_id: sourceUnmatchedQuestionId,
        });

        if (rpcError) {
          setError(t(mapKbRpcError(rpcError.message)));
          return;
        }
      } else if (entry) {
        const { error: rpcError } = await supabase.rpc("rpc_kb_entry_update", {
          p_id: entry.id,
          p_category_id: categoryId,
          p_question_fil: questionFil.trim(),
          p_question_en: questionEn.trim(),
          p_answer_fil: answerFil.trim(),
          p_answer_en: answerEn.trim(),
          p_keywords: keywordList,
          p_image_url: imageUrl,
          p_owner_user_id: ownerUserId || null,
          p_review_due_on: reviewDueOn || null,
          p_status: status,
        });

        if (rpcError) {
          setError(t(mapKbRpcError(rpcError.message)));
          return;
        }
      }

      router.push("/admin/kb/entries");
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
      {prefill ? (
        <p className="rounded-md bg-secondary/10 px-4 py-3 text-sm text-ink">
          {t("prefillBanner", { question: prefill.text })}
        </p>
      ) : null}

      <Field label={t("categoryLabel")} htmlFor="entry-category">
        <select
          id="entry-category"
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
        <Field label={t("questionFilLabel")} htmlFor="entry-question-fil">
          <input
            id="entry-question-fil"
            required
            value={questionFil}
            onChange={(event) => setQuestionFil(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("questionEnLabel")} htmlFor="entry-question-en">
          <input
            id="entry-question-en"
            required
            value={questionEn}
            onChange={(event) => setQuestionEn(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("answerFilLabel")} htmlFor="entry-answer-fil">
          <textarea
            id="entry-answer-fil"
            required
            rows={4}
            value={answerFil}
            onChange={(event) => setAnswerFil(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("answerEnLabel")} htmlFor="entry-answer-en">
          <textarea
            id="entry-answer-en"
            required
            rows={4}
            value={answerEn}
            onChange={(event) => setAnswerEn(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={t("keywordsLabel")} htmlFor="entry-keywords">
        <input
          id="entry-keywords"
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder={t("keywordsPlaceholder")}
          className={inputClass}
        />
      </Field>

      <Field label={t("imageLabel")} htmlFor="entry-image">
        <ImageUpload imageUrl={imageUrl} onChange={setImageUrl} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("ownerLabel")} htmlFor="entry-owner">
          <select
            id="entry-owner"
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
        <Field label={t("reviewDueLabel")} htmlFor="entry-review-due">
          <input
            id="entry-review-due"
            type="date"
            value={reviewDueOn}
            onChange={(event) => setReviewDueOn(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {entry ? (
        <p className="text-sm text-ink/70">
          {t("currentStatus")}: {t(entry.status === "published" ? "statusPublished" : "statusDraft")}
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
          className="rounded-md bg-primary px-4 py-2 font-medium text-canvas transition-opacity disabled:opacity-60"
        >
          {loading ? t("saving") : t("publishAction")}
        </button>
      </div>
    </form>
  );
}

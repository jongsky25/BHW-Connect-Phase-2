"use client";

import type { JSONContent } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createArticle, type ArticleActionState } from "./actions";
import { RichTextEditor } from "./rich-text-editor";

const initialState: ArticleActionState = {};

function defaultReviewDueOn(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().slice(0, 10);
}

function SubmitButtons() {
  const { pending } = useFormStatus();
  const t = useTranslations("kb");
  return (
    <div className="flex gap-2">
      <button
        type="submit"
        name="status"
        value="draft"
        disabled={pending}
        className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {t("saveDraft")}
      </button>
      <button
        type="submit"
        name="status"
        value="published"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-canvas disabled:opacity-60"
      >
        {t("publish")}
      </button>
    </div>
  );
}

export function ArticleForm({
  categories,
  admins,
  currentUserId,
}: {
  categories: { id: string; name_fil: string }[];
  admins: { id: string; full_name: string }[];
  currentUserId: string;
}) {
  const t = useTranslations("kb");
  const [state, formAction] = useActionState(createArticle, initialState);
  const [bodyFil, setBodyFil] = useState<JSONContent>({});
  const [bodyEn, setBodyEn] = useState<JSONContent>({});

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-ink/10 p-4">
      <h2 className="text-lg font-semibold text-ink">{t("addArticle")}</h2>
      {state.error ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("category")}
          <select
            name="categoryId"
            required
            defaultValue={categories[0]?.id ?? ""}
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name_fil}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("owner")}
          <select
            name="ownerUserId"
            defaultValue={currentUserId}
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          >
            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("titleFil")}
          <input
            name="titleFil"
            required
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("titleEn")}
          <input
            name="titleEn"
            required
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("reviewDueOn")}
          <input
            name="reviewDueOn"
            type="date"
            defaultValue={defaultReviewDueOn()}
            className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-base text-ink"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("bodyFil")}
        <RichTextEditor onChange={setBodyFil} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("bodyEn")}
        <RichTextEditor onChange={setBodyEn} />
      </label>
      <input type="hidden" name="bodyFil" value={JSON.stringify(bodyFil)} />
      <input type="hidden" name="bodyEn" value={JSON.stringify(bodyEn)} />
      <SubmitButtons />
    </form>
  );
}

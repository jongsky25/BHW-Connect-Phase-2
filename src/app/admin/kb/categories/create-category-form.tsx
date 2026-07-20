"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createCategory, type CategoryActionState } from "./actions";

const initialState: CategoryActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("kb");
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-canvas disabled:opacity-60"
    >
      {t("addCategory")}
    </button>
  );
}

export function CreateCategoryForm() {
  const t = useTranslations("kb");
  const [state, formAction] = useActionState(createCategory, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-ink/10 p-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("nameFil")}
        <input name="nameFil" required className="w-40 rounded-lg border border-ink/15 bg-canvas px-2 py-1.5 text-sm text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("nameEn")}
        <input name="nameEn" required className="w-40 rounded-lg border border-ink/15 bg-canvas px-2 py-1.5 text-sm text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("slug")}
        <input name="slug" placeholder={t("slugHint")} className="w-32 rounded-lg border border-ink/15 bg-canvas px-2 py-1.5 text-sm text-ink" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        {t("sortOrder")}
        <input name="sortOrder" type="number" defaultValue={0} className="w-16 rounded-lg border border-ink/15 bg-canvas px-2 py-1.5 text-sm text-ink" />
      </label>
      <SubmitButton />
      {state.error ? <span className="text-sm text-danger">{t(`errors.${state.error}`)}</span> : null}
    </form>
  );
}

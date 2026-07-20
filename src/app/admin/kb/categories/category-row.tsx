"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteCategory, updateCategory, type CategoryActionState } from "./actions";

const initialState: CategoryActionState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("kb");
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-canvas disabled:opacity-60"
    >
      {t("save")}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("kb");
  return (
    <button type="submit" disabled={pending} className="text-sm text-danger hover:underline disabled:opacity-60">
      {t("delete")}
    </button>
  );
}

interface Category {
  id: string;
  name_fil: string;
  name_en: string;
  slug: string;
  sort_order: number;
}

export function CategoryRow({ category }: { category: Category }) {
  const t = useTranslations("kb");
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction] = useActionState(updateCategory, initialState);
  const [deleteState, deleteAction] = useActionState(deleteCategory, initialState);

  if (editing) {
    return (
      <tr className="border-b border-ink/5">
        <td colSpan={5} className="py-2">
          <form action={updateAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={category.id} />
            <input
              name="nameFil"
              defaultValue={category.name_fil}
              className="w-40 rounded-lg border border-ink/15 bg-canvas px-2 py-1 text-sm text-ink"
            />
            <input
              name="nameEn"
              defaultValue={category.name_en}
              className="w-40 rounded-lg border border-ink/15 bg-canvas px-2 py-1 text-sm text-ink"
            />
            <input
              name="slug"
              defaultValue={category.slug}
              className="w-32 rounded-lg border border-ink/15 bg-canvas px-2 py-1 text-sm text-ink"
            />
            <input
              name="sortOrder"
              type="number"
              defaultValue={category.sort_order}
              className="w-16 rounded-lg border border-ink/15 bg-canvas px-2 py-1 text-sm text-ink"
            />
            <SaveButton />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-ink/60 hover:underline"
            >
              {t("cancel")}
            </button>
            {updateState.error ? <span className="text-xs text-danger">{t(`errors.${updateState.error}`)}</span> : null}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-ink/5">
      <td className="py-2 pr-4 text-ink">{category.name_fil}</td>
      <td className="py-2 pr-4 text-ink/70">{category.name_en}</td>
      <td className="py-2 pr-4 text-ink/70">{category.slug}</td>
      <td className="py-2 pr-4 text-ink/70">{category.sort_order}</td>
      <td className="py-2 pr-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setEditing(true)} className="text-sm text-secondary hover:underline">
            {t("edit")}
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={category.id} />
            <DeleteButton />
          </form>
        </div>
        {deleteState.error ? <p className="text-xs text-danger">{t(`errors.${deleteState.error}`)}</p> : null}
      </td>
    </tr>
  );
}

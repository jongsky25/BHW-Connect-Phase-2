"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setEntryStatus, type EntryActionState } from "./actions";

const initialState: EntryActionState = {};

function ToggleButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-sm text-secondary hover:underline disabled:opacity-60">
      {label}
    </button>
  );
}

export function EntryStatusToggle({ id, status }: { id: string; status: "draft" | "published" }) {
  const t = useTranslations("kb");
  const [state, formAction] = useActionState(setEntryStatus, initialState);
  const nextStatus = status === "published" ? "draft" : "published";

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={nextStatus} />
        <ToggleButton label={nextStatus === "published" ? t("publish") : t("saveDraft")} />
      </form>
      {state.error ? <p className="text-xs text-danger">{t(`errors.${state.error}`)}</p> : null}
    </div>
  );
}

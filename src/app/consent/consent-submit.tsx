"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

export function ConsentSubmit() {
  const { pending } = useFormStatus();
  const t = useTranslations("consent");

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full max-w-sm rounded-lg bg-primary px-4 py-3 text-base font-semibold text-canvas transition-opacity disabled:opacity-60"
    >
      {pending ? t("agreeing") : t("agree")}
    </button>
  );
}

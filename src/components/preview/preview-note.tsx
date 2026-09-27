"use client";

import { useTranslations } from "next-intl";

// The inline note shown next to a disabled write action while previewing
// (docs/role-feature-toggles-plan.md §6 B2). A shared component so the copy
// and styling can't drift between the dozen or so forms that need it.
export function PreviewNote() {
  const t = useTranslations("preview");
  return <p className="text-sm text-ink/60">{t("readOnlyNote")}</p>;
}

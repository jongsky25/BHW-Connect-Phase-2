"use client";

import { useTranslations } from "next-intl";
import type { VisibilityState } from "./types";

// Archived implies hidden_at was cleared (rpc_content_set_visibility), but
// checking archived_at first keeps this correct even against a stale read.
export function VisibilityBadge({ hidden_at, archived_at }: VisibilityState) {
  const t = useTranslations("admin.visibility");

  if (archived_at) {
    return (
      <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-medium text-ink/70">
        {t("archivedBadge")}
      </span>
    );
  }
  if (hidden_at) {
    return (
      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
        {t("hiddenBadge")}
      </span>
    );
  }
  return null;
}

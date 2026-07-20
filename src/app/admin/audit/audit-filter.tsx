"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function AuditFilter({
  eventTypes,
  selected,
}: {
  eventTypes: string[];
  selected?: string;
}) {
  const router = useRouter();
  const t = useTranslations("admin");

  return (
    <select
      value={selected ?? ""}
      onChange={(event) => {
        const value = event.target.value;
        router.push(value ? `/admin/audit?event=${encodeURIComponent(value)}` : "/admin/audit");
      }}
      className="rounded-lg border border-ink/15 bg-canvas px-3 py-2 text-sm text-ink"
    >
      <option value="">{t("auditFilterAll")}</option>
      {eventTypes.map((type) => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  );
}

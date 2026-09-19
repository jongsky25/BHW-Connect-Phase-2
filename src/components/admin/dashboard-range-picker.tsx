"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { parseTimeRangeKey } from "@/lib/dashboard/time-range";
import type { TimeRangeKey } from "@/lib/dashboard/types";

const RANGE_KEYS: readonly TimeRangeKey[] = ["7", "30", "90"];
const RANGE_LABEL_KEY: Record<TimeRangeKey, string> = {
  "7": "range7",
  "30": "range30",
  "90": "range90",
};

export function DashboardRangePicker() {
  const t = useTranslations("admin.dashboard");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRange = parseTimeRangeKey(searchParams.get("range") ?? undefined);

  return (
    <div role="group" aria-label={t("rangeLabel")} className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-ink/70">{t("rangeLabel")}</span>
      {RANGE_KEYS.map((key) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("range", key);
        const isActive = key === activeRange;
        return (
          <Link
            key={key}
            href={`${pathname}?${params.toString()}`}
            aria-current={isActive ? "true" : undefined}
            className={
              isActive
                ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-on-primary"
                : "rounded-md border border-ink/20 px-3 py-1.5 text-sm font-medium text-ink hover:bg-ink/5"
            }
          >
            {t(RANGE_LABEL_KEY[key])}
          </Link>
        );
      })}
    </div>
  );
}

import type { Counts, ProgressState } from "@/lib/progress/manual-progress";
import { STATE_STYLES, type Locale } from "./progress-styles";

export type BarSegment = { counts: Counts; state: ProgressState; label: string };

/** "4/6 · 67%" in the learner's language. */
export function countsText(c: Counts, locale: Locale) {
  return `${c.done}/${c.total} ${locale === "en" ? "lessons" : "aralin"} · ${c.percent}%`;
}

// A rounded bar whose fill colour follows the state. With `segments` (one per
// subchapter) it splits into proportional parts so the learner can see which
// part is unfinished. The number is always printed beside the bar.
export function ProgressBar({
  counts,
  state,
  label,
  locale,
  segments,
  size = "md",
}: {
  counts: Counts;
  state: ProgressState;
  label: string;
  locale: Locale;
  segments?: BarSegment[];
  size?: "sm" | "md";
}) {
  const height = size === "sm" ? "h-2" : "h-3";
  const parts = segments?.filter((s) => s.counts.total > 0) ?? [];
  return (
    <div className="flex w-full items-center gap-3">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={counts.percent}
        aria-valuetext={countsText(counts, locale)}
        className={`flex ${height} min-w-0 flex-1 gap-0.5 overflow-hidden rounded-full`}
      >
        {parts.length > 1 ? (
          parts.map((s) => (
            <div
              key={s.label}
              title={`${s.label}: ${countsText(s.counts, locale)}`}
              className="h-full overflow-hidden bg-ink/10 first:rounded-l-full last:rounded-r-full"
              style={{ flexGrow: s.counts.total, flexBasis: 0 }}
            >
              <div
                className={`h-full motion-safe:transition-[width] motion-safe:duration-500 ${STATE_STYLES[s.state].bar}`}
                style={{ width: `${s.counts.total ? (s.counts.done / s.counts.total) * 100 : 0}%` }}
              />
            </div>
          ))
        ) : (
          <div className="h-full w-full rounded-full bg-ink/10">
            <div
              className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500 ${STATE_STYLES[state].bar}`}
              style={{ width: `${counts.percent}%` }}
            />
          </div>
        )}
      </div>
      <span className="shrink-0 text-sm tabular-nums text-ink/80">{countsText(counts, locale)}</span>
    </div>
  );
}

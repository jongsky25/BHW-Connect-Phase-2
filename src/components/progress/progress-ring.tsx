import type { Counts, ProgressState } from "@/lib/progress/manual-progress";
import { STATE_STYLES, type Locale } from "./progress-styles";
import { countsText } from "./progress-bar";

const R = 42;
const C = 2 * Math.PI * R;

// The hero figure for a whole manual: one per page.
export function ProgressRing({
  counts,
  state,
  label,
  locale,
  className = "h-20 w-20 sm:h-28 sm:w-28",
}: {
  counts: Counts;
  state: ProgressState;
  label: string;
  locale: Locale;
  /** Tailwind size classes; the ring scales down on phones. */
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={counts.percent}
      aria-valuetext={countsText(counts, locale)}
      className={`relative shrink-0 ${className}`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="10" className="stroke-ink/10" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - counts.percent / 100)}
          className={`motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 ${counts.percent ? STATE_STYLES[state].ring : "stroke-transparent"}`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-xl font-bold tabular-nums sm:text-2xl">{counts.percent}%</span>
        <span className="text-xs text-ink/70">
          {counts.done}/{counts.total}
        </span>
      </span>
    </div>
  );
}

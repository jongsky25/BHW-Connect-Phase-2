import type { ChapterProgress, Counts, ProgressState } from "@/lib/progress/manual-progress";
import { ProgressBar, type BarSegment } from "./progress-bar";
import type { Locale } from "./progress-styles";
import { StatusChip } from "./status-chip";

/** One bar segment per subchapter, so a chapter bar shows which part is unfinished. */
export function subchapterSegments(chapter: ChapterProgress, locale: Locale): BarSegment[] {
  return chapter.subchapters.map((s) => ({
    counts: s.counts,
    state: s.state,
    label: `${s.number} ${locale === "en" ? s.title_en : s.title_fil}`,
  }));
}

// Status chip plus a small bar, for chapter and subchapter cards.
export function CardProgress({
  state,
  counts,
  label,
  locale,
  segments,
}: {
  state: ProgressState;
  counts: Counts;
  label: string;
  locale: Locale;
  segments?: BarSegment[];
}) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <div>
        <StatusChip state={state} locale={locale} />
      </div>
      {counts.total > 0 ? (
        <ProgressBar size="sm" counts={counts} state={state} label={label} locale={locale} segments={segments} />
      ) : null}
    </div>
  );
}

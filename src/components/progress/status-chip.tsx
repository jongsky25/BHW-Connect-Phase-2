import type { LessonState, ProgressState } from "@/lib/progress/manual-progress";
import { LESSON_STYLES, STATE_STYLES, say, type Locale } from "./progress-styles";

export function StatusChip({ state, locale }: { state: ProgressState; locale: Locale }) {
  const style = STATE_STYLES[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.chip}`}
      data-state={state}
    >
      <span aria-hidden="true" className={`font-bold ${style.iconClass}`}>
        {style.icon}
      </span>
      {say(locale, style.label)}
    </span>
  );
}

// ✓ done, ● started, ○ not started — the per-lesson marker on a subchapter page.
export function LessonStatus({ state, locale }: { state: LessonState; locale: Locale }) {
  const style = LESSON_STYLES[state];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium" data-state={state}>
      <span aria-hidden="true" className={`font-bold ${style.iconClass}`}>
        {style.icon}
      </span>
      {say(locale, style.label)}
    </span>
  );
}

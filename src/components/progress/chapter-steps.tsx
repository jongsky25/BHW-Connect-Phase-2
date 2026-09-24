import type { ChapterStep } from "@/lib/progress/manual-progress";
import { STEP_LABELS, STEP_STYLES, say, type Locale } from "./progress-styles";

// Pretest → Lessons → Post-test → Certificate. Kept apart from the lesson
// percentage on purpose (docs/bhw-progress-plan.md §1, decision 2).
export function ChapterSteps({ steps, locale }: { steps: ChapterStep[]; locale: Locale }) {
  if (!steps.length) return null;
  return (
    <ol
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      aria-label={locale === "en" ? "Chapter steps" : "Mga hakbang ng kabanata"}
    >
      {steps.map((step) => {
        const style = STEP_STYLES[step.state];
        return (
          <li
            key={step.key}
            data-state={step.state}
            aria-current={step.state === "current" ? "step" : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${style.dot}`}
              aria-hidden="true"
            >
              {style.icon}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-medium">{say(locale, STEP_LABELS[step.key])}</span>
              <span className="text-xs text-ink/70">{say(locale, style.label)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

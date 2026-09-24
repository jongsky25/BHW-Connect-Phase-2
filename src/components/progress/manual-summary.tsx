import type { ManualProgress } from "@/lib/progress/manual-progress";
import { ContinueLink } from "./my-training-card";
import { ProgressRing } from "./progress-ring";
import type { Locale } from "./progress-styles";
import { StatusChip } from "./status-chip";

// The hero at the top of the manual overview: overall ring, count, state and
// Continue. The chapter cards below carry the per-chapter detail.
export function ManualSummary({ progress, title, locale }: { progress: ManualProgress; title: string; locale: Locale }) {
  const en = locale === "en";
  const text = (fil: string, eng: string) => (en ? eng : fil);
  return (
    <section
      aria-label={text("Ang iyong progreso", "Your progress")}
      className="flex flex-col gap-4 rounded-xl border border-ink/15 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-4">
        <ProgressRing
          counts={progress.counts}
          state={progress.state}
          locale={locale}
          label={text(`Kabuuang progreso sa ${title}`, `Overall progress in ${title}`)}
        />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-semibold">
            {text(
              `${progress.counts.done} sa ${progress.counts.total} na aralin ang tapos`,
              `${progress.counts.done} of ${progress.counts.total} lessons done`,
            )}
          </p>
          <div>
            <StatusChip state={progress.state} locale={locale} />
          </div>
        </div>
      </div>
      {progress.continueTo ? <ContinueLink to={progress.continueTo} locale={locale} /> : null}
    </section>
  );
}

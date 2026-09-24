import type { SupervisorRow } from "@/lib/progress/load-supervisor-progress";
import { subchapterSegments } from "./card-progress";
import { ChapterSteps } from "./chapter-steps";
import { ProgressBar, type BarSegment } from "./progress-bar";
import type { Locale } from "./progress-styles";
import { StatusChip } from "./status-chip";

// One BHW in the supervisor view (docs/bhw-progress-plan.md Phase 3): the
// manual bar split by chapter in the summary line, and each chapter's chip,
// bar, steps and subchapter bars when opened. Native <details> so the page
// stays a server component.
export function BhwProgressCard({
  row,
  locale,
  detailsLabel,
}: {
  row: SupervisorRow;
  locale: Locale;
  detailsLabel: string;
}) {
  const { bhw, progress } = row;
  const en = locale === "en";
  const text = (fil: string, eng: string) => (en ? eng : fil);
  const title = (x: { title_fil: string; title_en: string }) => (en ? x.title_en : x.title_fil);
  const chapterSegments: BarSegment[] = progress.chapters.map((ch) => ({
    counts: ch.counts,
    state: ch.state,
    label: `${text("Kabanata", "Chapter")} ${ch.number}`,
  }));

  return (
    <li className="rounded-xl border border-ink/15" data-state={progress.state}>
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 sm:w-56 sm:shrink-0">
            <p className="font-semibold text-ink">{bhw.full_name}</p>
            <p className="truncate text-xs text-ink/70">
              {bhw.username} · {bhw.org_unit_name ?? "—"}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip state={progress.state} locale={locale} />
              <span className="text-xs text-ink/70 underline group-open:no-underline">{detailsLabel}</span>
            </div>
            {progress.counts.total > 0 ? (
              <ProgressBar
                size="sm"
                counts={progress.counts}
                state={progress.state}
                locale={locale}
                segments={chapterSegments}
                label={text(
                  `${bhw.full_name}: ${progress.counts.done} sa ${progress.counts.total} na aralin tapos`,
                  `${bhw.full_name}: ${progress.counts.done} of ${progress.counts.total} lessons done`,
                )}
              />
            ) : null}
          </div>
        </summary>

        <ol className="flex flex-col gap-4 border-t border-ink/10 p-4">
          {progress.chapters.map((ch) => (
            <li key={ch.id} className="flex flex-col gap-3" data-state={ch.state}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-ink">
                  {text("Kabanata", "Chapter")} {ch.number}: {title(ch)}
                </p>
                <StatusChip state={ch.state} locale={locale} />
              </div>
              {ch.counts.total > 0 ? (
                <ProgressBar
                  counts={ch.counts}
                  state={ch.state}
                  locale={locale}
                  segments={subchapterSegments(ch, locale)}
                  label={text(
                    `${bhw.full_name}, Kabanata ${ch.number}: ${ch.counts.done} sa ${ch.counts.total} na aralin tapos`,
                    `${bhw.full_name}, Chapter ${ch.number}: ${ch.counts.done} of ${ch.counts.total} lessons done`,
                  )}
                />
              ) : null}
              <ChapterSteps steps={ch.steps} locale={locale} />
              {ch.subchapters.length > 0 ? (
                <ul className="flex flex-col gap-2 sm:pl-4">
                  {ch.subchapters.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4"
                      data-state={s.state}
                    >
                      <span className="text-sm text-ink sm:w-64 sm:shrink-0">
                        {s.number} {title(s)}
                      </span>
                      {s.counts.total > 0 ? (
                        <ProgressBar
                          size="sm"
                          counts={s.counts}
                          state={s.state}
                          locale={locale}
                          label={text(
                            `${bhw.full_name}, ${s.number}: ${s.counts.done} sa ${s.counts.total} na aralin tapos`,
                            `${bhw.full_name}, ${s.number}: ${s.counts.done} of ${s.counts.total} lessons done`,
                          )}
                        />
                      ) : (
                        <StatusChip state={s.state} locale={locale} />
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </details>
    </li>
  );
}

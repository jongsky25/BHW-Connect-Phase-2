import Link from "next/link";
import type { ContinueTarget, ManualProgress } from "@/lib/progress/manual-progress";
import { subchapterSegments } from "./card-progress";
import { ProgressBar } from "./progress-bar";
import { ProgressRing } from "./progress-ring";
import { type Locale } from "./progress-styles";
import { StatusChip } from "./status-chip";

export function manualTitle(p: Pick<ManualProgress, "contentKey" | "title_fil" | "title_en">, locale: Locale) {
  return p.contentKey === "bhw-reference-manual" ? "BHW Reference Manual" : locale === "en" ? p.title_en : p.title_fil;
}

export function ContinueLink({ to, locale }: { to: ContinueTarget; locale: Locale }) {
  const en = locale === "en";
  return (
    <Link prefetch={false} href={to.href} className="rounded-md bg-primary px-5 py-3 font-medium text-on-primary">
      {en ? "Continue where you left off" : "Ituloy kung saan ka tumigil"}
      <span className="block text-xs font-normal">
        {to.subchapterNumber} · {en ? to.title_en : to.title_fil}
      </span>
    </Link>
  );
}

// "My training" on /home: overall ring, one line per chapter, Continue.
export function MyTrainingCard({ progress, locale }: { progress: ManualProgress; locale: Locale }) {
  const en = locale === "en";
  const text = (fil: string, eng: string) => (en ? eng : fil);
  const title = manualTitle(progress, locale);
  const manualHref = `/training/${progress.programId}`;
  const next = progress.continueTo;
  const currentChapter = next
    ? progress.chapters.find((chapter) => chapter.number === next.chapterNumber)
    : progress.chapters.find((chapter) =>
        chapter.state === "ready_for_assessment" || chapter.state === "retake_assessment",
      );
  const currentSubchapter = next
    ? currentChapter?.subchapters.find((subchapter) => subchapter.number === next.subchapterNumber)
    : null;
  const lessonsToMilestone = currentSubchapter
    ? currentSubchapter.counts.total - currentSubchapter.counts.done
    : 0;
  const nextStep = currentChapter
    ? next
      ? text(
          `Susunod: Kabanata ${currentChapter.number} · ${next.subchapterNumber}`,
          `Up next: Chapter ${currentChapter.number} · ${next.subchapterNumber}`,
        )
      : text(
          `Susunod: pagtatasa sa Kabanata ${currentChapter.number}`,
          `Up next: Chapter ${currentChapter.number} assessment`,
        )
    : progress.state === "certified"
      ? text("Natapos mo ang pagsasanay na ito.", "You completed this training.")
      : progress.state === "completed"
        ? text("Tapos na ang mga aralin. Tingnan ang mga susunod na hakbang.", "Lessons complete. View your next steps.")
        : text("Tingnan ang iyong mga kabanata at aralin.", "Explore your chapters and lessons.");
  return (
    <section
      aria-labelledby={`my-training-${progress.programId}`}
      className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-ink/15 shadow-sm"
    >
      <div className="flex flex-col gap-5 bg-celebration/10 p-5 sm:p-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <ProgressRing
            counts={progress.counts}
            state={progress.state}
            locale={locale}
            label={text(`Kabuuang progreso sa ${title}`, `Overall progress in ${title}`)}
          />
          <div className="flex min-w-0 flex-col gap-2">
            <h2 id={`my-training-${progress.programId}`} className="text-sm font-semibold text-primary-text">
              {text("Ang aking pagsasanay", "My training")}
            </h2>
            <p className="text-xl font-semibold leading-tight sm:text-2xl">{title}</p>
            <p className="text-sm text-ink/80">
              {progress.counts.total
                ? text(
                    `${progress.counts.done} sa ${progress.counts.total} na aralin ang tapos`,
                    `${progress.counts.done} of ${progress.counts.total} lessons done`,
                  )
                : text("Inihahanda pa ang mga aralin", "Lessons are being prepared")}
            </p>
            <StatusChip state={progress.state} locale={locale} />
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-2">
            <p className="text-sm font-medium text-ink">{nextStep}</p>
            {currentSubchapter && lessonsToMilestone > 0 ? (
              <p className="inline-flex items-start gap-2 rounded-full border border-celebration/60 bg-celebration/20 px-3 py-1.5 text-sm font-medium text-ink">
                <span aria-hidden="true" className="text-primary-text">✦</span>
                <span>
                  {lessonsToMilestone === 1
                    ? text(
                        `1 aralin na lang para matapos ang subchapter ${currentSubchapter.number}`,
                        `1 lesson to finish subchapter ${currentSubchapter.number}`,
                      )
                    : text(
                        `${lessonsToMilestone} aralin pa para matapos ang subchapter ${currentSubchapter.number}`,
                        `${lessonsToMilestone} lessons to finish subchapter ${currentSubchapter.number}`,
                      )}
                </span>
              </p>
            ) : null}
          </div>
          {next ? (
            <ContinueLink to={next} locale={locale} />
          ) : (
            <Link
              prefetch={false}
              href={currentChapter?.href ?? manualHref}
              className="rounded-md bg-primary px-5 py-3 text-center font-medium text-on-primary"
            >
              {currentChapter
                ? text("Tingnan ang susunod na hakbang", "View your next step")
                : text("Tingnan ang buong manual", "View the whole manual")}
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-ink/80">{text("Mga kabanata", "Chapters")}</h3>
        <ul className="flex flex-col gap-3">
          {progress.chapters.map((ch) => {
            const name = `${text("Kabanata", "Chapter")} ${ch.number}: ${en ? ch.title_en : ch.title_fil}`;
            return (
              <li key={ch.id} className="flex flex-col gap-1.5 rounded-lg border border-ink/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {ch.href ? (
                    <Link prefetch={false} href={ch.href} className="text-sm font-medium underline-offset-2 hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-ink/70">{name}</span>
                  )}
                  <StatusChip state={ch.state} locale={locale} />
                </div>
                {ch.counts.total > 0 ? (
                  <ProgressBar
                    size="sm"
                    counts={ch.counts}
                    state={ch.state}
                    locale={locale}
                    label={name}
                    segments={subchapterSegments(ch, locale)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>

        {next || currentChapter ? (
          <div className="flex flex-wrap items-center gap-3">
            <Link prefetch={false} href={manualHref} className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink">
              {text("Tingnan ang buong manual", "View the whole manual")}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

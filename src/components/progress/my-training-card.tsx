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
    <Link href={to.href} className="rounded-md bg-primary px-5 py-3 font-medium text-on-primary">
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
  return (
    <section
      aria-labelledby={`my-training-${progress.programId}`}
      className="flex w-full max-w-2xl flex-col gap-5 rounded-xl border border-ink/15 p-5"
    >
      <div className="flex items-center gap-4 sm:gap-5">
        <ProgressRing
          counts={progress.counts}
          state={progress.state}
          locale={locale}
          label={text(`Kabuuang progreso sa ${title}`, `Overall progress in ${title}`)}
        />
        <div className="flex min-w-0 flex-col gap-2">
          <h2 id={`my-training-${progress.programId}`} className="text-sm font-medium text-ink/70">
            {text("Ang aking pagsasanay", "My training")}
          </h2>
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-sm text-ink/80">
            {progress.counts.total
              ? text(
                  `${progress.counts.done} sa ${progress.counts.total} na aralin ang tapos`,
                  `${progress.counts.done} of ${progress.counts.total} lessons done`,
                )
              : text("Inihahanda pa ang mga aralin", "Lessons are being prepared")}
          </p>
          <div>
            <StatusChip state={progress.state} locale={locale} />
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {progress.chapters.map((ch) => {
          const name = `${text("Kabanata", "Chapter")} ${ch.number}: ${en ? ch.title_en : ch.title_fil}`;
          return (
            <li key={ch.id} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {ch.href ? (
                  <Link href={ch.href} className="text-sm font-medium underline-offset-2 hover:underline">
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

      <div className="flex flex-wrap items-center gap-3">
        {next ? <ContinueLink to={next} locale={locale} /> : null}
        <Link href={manualHref} className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink">
          {text("Tingnan ang buong manual", "View the whole manual")}
        </Link>
      </div>
    </section>
  );
}

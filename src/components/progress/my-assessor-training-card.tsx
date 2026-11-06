import Link from "next/link";
import type { AssessorStudyProgress } from "@/lib/progress/load-assessor-progress";
import type { Counts } from "@/lib/progress/manual-progress";
import { ProgressRing } from "./progress-ring";
import { ProgressBar } from "./progress-bar";
import type { Locale } from "./progress-styles";

const studyState = (c: Counts) => c.total > 0 && c.done === c.total ? "completed" : c.done > 0 ? "in_progress" : "not_started";

export function MyAssessorTrainingCard({ progress, locale }: { progress: AssessorStudyProgress; locale: Locale }) {
  const text = (fil: string, en: string) => locale === "en" ? en : fil;
  const next = progress.chapters.find(c => c.href && c.counts.done < c.counts.total);
  const complete = progress.counts.total > 0 && progress.counts.done === progress.counts.total;
  return <section aria-labelledby={`assessor-training-${progress.programId}`} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-ink/15 shadow-sm">
    <div className="space-y-4 bg-celebration/10 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <ProgressRing counts={progress.counts} state={studyState(progress.counts)} locale={locale} label={text("Progreso sa sariling pag-aaral ng assessor", "Assessor personal study progress")} />
        <div className="min-w-0 space-y-2 break-words">
          <h2 id={`assessor-training-${progress.programId}`} className="text-sm font-semibold text-ink">{text("Ang aking pagsasanay bilang assessor", "My assessor training")}</h2>
          <p className="text-xl font-semibold">BHW Reference Manual</p>
          <p className="text-sm">{text(`${progress.counts.done} sa ${progress.counts.total} na aralin ang tapos`, `${progress.counts.done} of ${progress.counts.total} lessons done`)}</p>
          <p className="text-sm text-ink/75">{text("Sariling pag-aaral · Kabanata 1 at 2", "Personal study · Chapters 1 and 2")}</p>
        </div>
      </div>
      {complete && <p className="font-medium">{text("Tapos na ang mga aralin", "Lessons complete")}</p>}
      <p className="text-sm text-ink/80">{text("Hiwalay ang pag-aaral sa sertipikasyon bilang assessor. Tingnan ang mga hakbang sa paghahanda sa bawat kabanata.", "Study progress is separate from assessor certification. Open each chapter to see your preparation steps.")}</p>
      {next && <Link prefetch={false} href={next.href!} className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 py-3 font-medium text-on-primary">
        {text(`Magpatuloy sa pag-aaral · Kabanata ${next.number}`, `Continue studying · Chapter ${next.number}`)}
      </Link>}
    </div>
    <div className="space-y-4 p-5 sm:p-6">
      <ul className="space-y-3">{progress.chapters.map(chapter => {
        const title = `${text("Kabanata", "Chapter")} ${chapter.number}: ${locale === "en" ? chapter.title_en : chapter.title_fil}`;
        return <li key={chapter.id} className="min-w-0 space-y-2 rounded-lg border border-ink/10 p-3">
          {chapter.href ? <Link prefetch={false} href={chapter.href} className="inline-flex min-h-11 items-center break-words text-sm font-medium underline underline-offset-2">{title}</Link> : <p className="break-words text-sm font-medium">{title}</p>}
          <ProgressBar counts={chapter.counts} state={studyState(chapter.counts)} label={title} locale={locale} size="sm" />
          <p className="text-sm text-ink/75">{!chapter.href ? text("Hindi pa available", "Not yet available") : chapter.missing > 0
            ? text(`${chapter.missing} kinakailangang aralin ang hindi pa available`, `${chapter.missing} required lessons are not yet available`)
            : chapter.counts.done === chapter.counts.total ? text("Tapos na ang mga aralin · tingnan ang susunod na hakbang", "Lessons complete · view next steps")
            : chapter.counts.done > 0 ? text("Kasalukuyang pinag-aaralan", "In progress") : text("Hindi pa nasisimulan", "Not started")}</p>
        </li>;
      })}</ul>
      <Link prefetch={false} href={`/training/${progress.programId}/assessor/qualifications`} className="inline-flex min-h-11 items-center rounded-md border border-ink/20 px-4 py-2 font-medium">{text("Aking mga sertipikasyon at susunod na hakbang", "My certifications and next steps")}</Link>
    </div>
  </section>;
}

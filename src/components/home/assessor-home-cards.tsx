import Link from "next/link";
import type { Counts } from "@/lib/progress/manual-progress";

type Locale = "en" | "fil";

// The assessor homepage's two primary destinations. Courses shows the
// assessor's own study progress (assessor_lesson_progress via
// loadAssessorProgress) — never a certification or assessment-authority
// signal. Assessments opens the /assessments hub, which links into the
// existing facilitator guide; it adds no assessment logic of its own.

function GraduationCapIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10 12 5 2 10l10 5 10-5Z" />
    <path d="M6 12v5c3 2 9 2 12 0v-5" />
    <path d="M22 10v6" />
  </svg>;
}

function ClipboardCheckIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </svg>;
}

const cardClass = "flex h-full min-w-0 flex-col gap-3 rounded-2xl border p-5 shadow-sm sm:p-6";
const buttonClass = "mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-lg px-5 py-3 text-center font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function AssessorHomeCards({ locale, progress, progressFailed }: {
  locale: Locale;
  /** Own study progress; null when it was not loaded (e.g. preview). */
  progress: Counts | null;
  progressFailed: boolean;
}) {
  const text = (fil: string, en: string) => locale === "en" ? en : fil;
  return <ul className="grid w-full grid-cols-1 gap-4 md:grid-cols-2" aria-label={text("Mga pangunahing gawain", "Main tasks")}>
    <li className="min-w-0">
      <section aria-labelledby="assessor-home-courses" className={`${cardClass} border-primary/25 bg-primary/10`}>
        <span className="text-primary-text"><GraduationCapIcon /></span>
        <h2 id="assessor-home-courses" className="text-xl font-semibold uppercase tracking-wide">{text("Mga Kurso ng Assessor", "Assessor Courses")}</h2>
        <p className="text-ink/80">{text("Tapusin ang kinakailangang pagsasanay at mga aralin bilang paghahanda sa pagtatasa ng mga BHW.",
          "Complete your required training and learning modules to prepare for BHW assessments.")}</p>
        {progress && progress.total > 0 ? <div className="space-y-2">
          <p className="text-3xl font-semibold text-primary-text">{progress.percent}%</p>
          <p className="text-sm">{text(`${progress.done} sa ${progress.total} aralin ang natapos`, `${progress.done} of ${progress.total} lessons completed`)}</p>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}
            aria-label={text("Progreso sa sariling pag-aaral", "Personal study progress")}
            className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="text-xs text-ink/70">{text("Hiwalay ang pag-aaral sa sertipikasyon bilang assessor.", "Study progress is separate from assessor certification.")}</p>
        </div> : progressFailed ? <p role="status" className="text-sm">
          {text("Hindi ma-load ang iyong progreso. I-reload ang pahina, o buksan ang Mga Kurso para magpatuloy.", "Your study progress could not be loaded. Reload this page, or open Courses to continue studying.")}
        </p> : <p className="text-sm text-ink/70">{text("Wala pang maipapakitang progreso.", "No study progress to show yet.")}</p>}
        <Link prefetch={false} href="/courses" className={`${buttonClass} bg-primary text-on-primary focus-visible:outline-primary`}>
          {text("Pumunta sa Mga Kurso", "Go to Courses")} <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </section>
    </li>
    <li className="min-w-0">
      <section aria-labelledby="assessor-home-assessments" className={`${cardClass} border-info/25 bg-info/10`}>
        <span className="text-info"><ClipboardCheckIcon /></span>
        <h2 id="assessor-home-assessments" className="text-xl font-semibold uppercase tracking-wide">{text("Pagtatasa sa mga BHW", "BHW Assessments")}</h2>
        <p className="text-ink/80">{text("Magsagawa ng return demonstration at suriin ang kakayahan ng mga Barangay Health Worker.",
          "Conduct return demonstrations and evaluate the competencies of Barangay Health Workers.")}</p>
        <div className="space-y-2">
          <p className="text-3xl font-semibold text-info">{text("Suriin ang mga BHW", "Assess BHWs")}</p>
          <p className="text-sm">{text("Pumili ng kabanata at subchapter, saka itala ang obserbasyon sa mga BHW sa iyong lugar.",
            "Choose a chapter and subchapter, then record observations for BHWs in your area.")}</p>
        </div>
        <Link prefetch={false} href="/assessments" className={`${buttonClass} bg-info-fill text-on-primary focus-visible:outline-info`}>
          {text("Pumunta sa Pagtatasa", "Go to Assessments")} <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </section>
    </li>
  </ul>;
}

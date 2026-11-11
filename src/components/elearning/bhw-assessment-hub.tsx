import Link from "next/link";

// Direct entry into BHW assessment work: chapter → subchapter → the existing
// facilitator guide opened on its "BHWs" section (roster + Record
// observation). Who appears there and who may record is decided by RLS and
// the observation RPCs, not by this page.

type Lang = "en" | "fil";
export type HubChapter = { chapter_key: string; position: number; title_fil: string; title_en: string };
export type HubSubchapter = { id: string; position: number; title_fil: string; title_en: string };

const numbered = /^\d+(\.\d+)*[\s.:)-]/;

export function BhwAssessmentHub({ lang, programId, areaName, assignmentValid, chapters, selected, subchapters, chapterError }: {
  lang: Lang;
  programId: string | null;
  areaName: string | null;
  assignmentValid: boolean;
  chapters: HubChapter[];
  selected: HubChapter | null;
  subchapters: HubSubchapter[];
  chapterError: boolean;
}) {
  const text = (fil: string, en: string) => lang === "en" ? en : fil;
  const title = (row: { title_fil: string; title_en: string }) => lang === "en" ? row.title_en : row.title_fil;
  const card = "flex min-h-12 flex-col gap-1 rounded-xl border border-info/25 bg-info/5 p-4 hover:bg-info/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-info";

  if (!assignmentValid) {
    return <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 p-4">
      {text("Walang nakitang barangay assignment. Makipag-ugnayan sa iyong system administrator.",
        "No barangay assignment found. Please contact your system administrator.")}
    </p>;
  }

  return <section aria-labelledby="bhw-assessment-hub" className="flex flex-col gap-4 rounded-2xl border border-info/25 p-5 sm:p-6">
    <div>
      <h2 id="bhw-assessment-hub" className="text-xl font-semibold">{text("Magsimula ng pagtatasa", "Start an assessment")}</h2>
      <p className="mt-1 text-sm text-ink/75">{text(
        "Pumili ng kabanata at subchapter. Bubukas ang listahan ng mga BHW kung saan maitatala mo ang obserbasyon mula sa return demonstration.",
        "Choose a chapter and subchapter. The BHW list opens, where you record what you observed in the return demonstration.")}</p>
      {areaName && <p className="mt-2 text-sm"><span className="font-medium">{text("Iyong nakatalagang lugar", "Your assigned area")}:</span> {areaName}</p>}
    </div>
    {chapterError ? <p role="alert">{text("Hindi ma-load ang mga kabanata. Subukang muli.", "Chapters could not be loaded. Try again.")}</p>
      : !programId || chapters.length === 0 ? <p>{text("Wala pang available na kabanata para sa pagtatasa.", "No chapters are available for assessment yet.")}</p>
      : <>
        <nav aria-labelledby="hub-chapters">
          <h3 id="hub-chapters" className="mb-2 font-semibold">{text("1. Pumili ng kabanata", "1. Select a chapter")}</h3>
          <ul className="grid gap-3 sm:grid-cols-2">{chapters.map(chapter => {
            const current = selected?.chapter_key === chapter.chapter_key;
            return <li key={chapter.chapter_key} className="min-w-0">
              <Link prefetch={false} href={`/assessments?chapter=${encodeURIComponent(chapter.chapter_key)}`} aria-current={current ? "page" : undefined}
                className={`${card} ${current ? "border-info bg-info/15" : ""}`}>
                <span className="text-sm text-ink/70">{text("Kabanata", "Chapter")} {chapter.position + 1}</span>
                <span className="break-words font-semibold">{title(chapter)}</span>
              </Link>
            </li>;
          })}</ul>
        </nav>
        {selected && <nav aria-labelledby="hub-subchapters">
          <h3 id="hub-subchapters" className="mb-2 font-semibold">{text("2. Pumili ng subchapter", "2. Select a subchapter")}</h3>
          {subchapters.length === 0 ? <p>{text("Wala pang subchapter sa kabanatang ito.", "This chapter has no subchapters yet.")}</p>
            : <ul className="grid gap-3 sm:grid-cols-2">{subchapters.map(sub => {
              const label = title(sub);
              const number = `${selected.position + 1}.${sub.position + 1}`;
              return <li key={sub.id} className="min-w-0">
                <Link prefetch={false} href={`/training/${programId}/${selected.chapter_key}/${sub.id}?view=bhws`} className={card}>
                  <span className="break-words font-semibold">{numbered.test(label) ? label : `${number} ${label}`}</span>
                  <span className="text-sm text-ink/70">{text("Mga BHW at pagtatala ng obserbasyon →", "BHWs and Record observation →")}</span>
                </Link>
              </li>;
            })}</ul>}
        </nav>}
      </>}
  </section>;
}

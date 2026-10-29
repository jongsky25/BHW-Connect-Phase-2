import Link from "next/link";
import type { PersonalTestHistory } from "@/lib/elearning/test-results";

export function PersonalTestResults({ history, locale, page = 1 }: { history: PersonalTestHistory; locale: string; page?: number }) {
  const en = locale === "en";
  const text = (english: string, fil: string) => en ? english : fil;
  return <section className="space-y-5" aria-labelledby="personal-results-title">
    <h1 id="personal-results-title" className="text-2xl font-semibold">{text("My test results", "Aking mga resulta sa pagsusulit")}</h1>
    <p>{text("Your completed pre-tests and post-tests, newest first. Knowledge-test scores and practical performance ratings are separate.", "Iyong mga natapos na pre-test at post-test, mula sa pinakabago. Hiwalay ang iskor sa pagsusulit at marka sa praktikal na pagganap.")}</p>
    <p className="text-sm text-ink/70">{text("Results retain their original test versions. Different versions are not automatically comparable.", "Nananatili ang resulta sa orihinal na bersiyon ng pagsusulit. Hindi awtomatikong maihahambing ang magkaibang bersiyon.")}</p>
    <p className="rounded-lg border border-ink/20 bg-ink/5 p-4 text-sm">{text("Pre-tests show your starting score; baseline answer keys are not shown. Completed Chapter 1 post-tests have a review link when saved review evidence is available.", "Ipinapakita ng pre-test ang panimulang iskor; hindi ipinapakita ang tamang sagot sa baseline. May review link ang natapos na Chapter 1 post-test kapag may naitalang ebidensiya para sa pagsuri.")}</p>
    {history.items.length === 0 ? <p className="rounded-lg border border-ink/15 p-5">{text("No completed tests on this page yet. Your saved drafts remain in the chapter assessment.", "Wala pang natapos na pagsusulit sa pahinang ito. Nasa pagtatasa ng kabanata pa rin ang mga naka-save na draft.")}</p> :
      <ol className="space-y-4">{history.items.map(row => <li id={`test-result-${row.generation}-${row.id}`} key={`${row.generation}:${row.id}`} className="space-y-3 rounded-xl border border-ink/20 p-5">
        <h2 className="text-lg font-semibold">{en ? row.title_en : row.title_fil}</h2>
        <p className="text-sm font-medium">{row.phase === "pretest" ? text("Pre-test · starting point", "Pre-test · panimulang punto") : text("Post-test", "Post-test")}</p>
        <p className="text-xl font-semibold">{row.correct_count !== null && row.question_count !== null
          ? text(`${row.correct_count}/${row.question_count} correct · ${row.score_percent}%`, `${row.correct_count}/${row.question_count} tama · ${row.score_percent}%`)
          : text(`Stored score: ${row.score_percent}%`, `Naka-save na iskor: ${row.score_percent}%`)}</p>
        <p className="text-sm text-ink/70"><time dateTime={row.submitted_at}>{new Intl.DateTimeFormat(en ? "en-PH" : "fil-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(row.submitted_at))}</time> · {text("Philippine time", "Oras sa Pilipinas")}</p>
        {row.correct_count === null && <p className="text-sm text-ink/70">{text("An exact raw count cannot be verified for this record. The saved percentage is retained.", "Hindi matiyak ang eksaktong raw count para sa talang ito. Pinananatili ang naka-save na porsiyento.")}</p>}
        {row.form_id && <p className="break-words text-xs text-ink/60">{text("Form", "Form")}: {row.form_id}</p>}
        {row.review_attempt_id && <Link prefetch={false} href={`/courses/${row.course_id}/assessment/review/${row.review_attempt_id}`} className="inline-flex min-h-[44px] items-center font-medium underline">
          {row.generation !== "versioned" ? text("View historical responses", "Tingnan ang mga dating naitalang sagot") : text("Review answers and explanations", "Balikan ang mga sagot at paliwanag")}
        </Link>}
      </li>)}</ol>}
    <nav aria-label={text("Results pages", "Mga pahina ng resulta")} className="flex flex-wrap gap-4">
      {page > 1 && <Link prefetch={false} href={`/my-results?page=${page - 1}`} className="inline-flex min-h-[44px] items-center underline">{text("Newer results", "Mas bagong resulta")}</Link>}
      {history.has_more && page < 501 && <Link prefetch={false} href={`/my-results?page=${page + 1}`} className="inline-flex min-h-[44px] items-center underline">{text("Older results", "Mas lumang resulta")}</Link>}
    </nav>
  </section>;
}

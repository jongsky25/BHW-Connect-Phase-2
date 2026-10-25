import Link from 'next/link';
import {overallNextStep, type OverallProgress} from '@/lib/assessor/overall-certifications';

export const ASSESSOR_STUDY_PROGRESS_ID = 'assessor-study-progress';

export function AssessorStudyProgressLink({chapterHref, locale}: {chapterHref: string; locale: string}) {
  return <nav aria-label={locale === 'en' ? 'Your assessor study' : 'Sarili mong pag-aaral bilang assessor'}>
    <Link prefetch={false} href={`${chapterHref}#${ASSESSOR_STUDY_PROGRESS_ID}`}
      className="inline-flex min-h-11 items-center rounded-md border border-ink/25 px-4 py-3 font-medium text-ink underline">
      {locale === 'en' ? 'Study progress and lesson list' : 'Progreso sa pag-aaral at listahan ng mga aralin'}
    </Link>
  </nav>;
}

type StudyChapter = {key: string; title: string};

export function AssessorProgressGuide({programId, locale, progress, chapters, readFailed}: {
  programId: string; locale: string; progress: OverallProgress | null; chapters: StudyChapter[]; readFailed: boolean;
}) {
  const en = locale === 'en';
  const text = (fil: string, english: string) => en ? english : fil;
  // These are the two existing personal-study routes. Chapter 3 records may
  // exist without an implemented personal-study route; never invent that URL.
  const available = readFailed ? [] : chapters.filter(c => ['chapter-1', 'chapter-2'].includes(c.key));
  const match = progress && !readFailed ? /^(complete|review)_chapter-([123])$/.exec(progress.nextStep ?? '') : null;
  const key = match ? `chapter-${match[2]}` : null;
  const study = match?.[1] === 'complete' && available.some(c => c.key === key);
  const href = match ? study
    ? `/training/${programId}/assessor/${key}#${ASSESSOR_STUDY_PROGRESS_ID}`
    : `#${key}` : null;
  return <aside aria-labelledby="assessor-progress-guide-title" className="min-w-0 space-y-3 rounded-xl border border-ink/20 bg-canvas p-4 sm:p-5">
    <h2 id="assessor-progress-guide-title" className="text-lg font-semibold">{text('Saan makikita ang progreso at susunod na hakbang?', 'Where can I see progress and next steps?')}</h2>
    <p className="text-sm text-ink/80">{text(
      'Ipinapakita ng progreso sa pag-aaral ang natapos mong mga aralin at mga kailangan pang hakbang sa paghahanda. Ipinapakita naman ng sertipikasyon ang naitalang pagkamit. Ang pagtatapos ng mga aralin lamang ay hindi pahintulot sa pormal na pagtatasa.',
      'Study progress shows your completed lessons and remaining preparation steps. Certification records show recorded achievement. Completing lessons alone does not authorize formal assessment.')}</p>
    {readFailed || !progress ? <div role="status" className="space-y-2 text-sm">
      <p>{text('Hindi makumpirma ang susunod na hakbang ngayon. Basahin muli ang katayuan.', 'The next step could not be confirmed. Reload the status.')}</p>
      <Link prefetch={false} className="inline-flex min-h-11 items-center underline" href={`/training/${programId}/assessor/qualifications`}>{text('Basahin muli ang katayuan', 'Reload status')}</Link>
    </div> : <div className="space-y-2">
      <h3 className="font-semibold">{text('Susunod na hakbang', 'Next step')}</h3>
      <p className="text-sm">{overallNextStep(progress.nextStep, en)}</p>
      {href && <Link prefetch={false} className="inline-flex min-h-11 items-center wrap-anywhere text-ink underline" href={href}>
        {study ? text(`Buksan ang progreso sa pag-aaral sa Kabanata ${match![2]}`, `Open Chapter ${match![2]} study progress`)
          : text(`Suriin ang tala sa Kabanata ${match![2]} sa ibaba`, `Review Chapter ${match![2]} record below`)}
      </Link>}
    </div>}
    {available.length > 0 && <nav aria-label={text('Progreso sa pag-aaral ayon sa kabanata', 'Study progress by chapter')}>
      <h3 className="font-semibold">{text('Sarili mong pag-aaral bilang assessor', 'Your own assessor study')}</h3>
      <ul className="mt-2 space-y-2">{available.map(chapter => <li key={chapter.key}>
        <Link prefetch={false} className="inline-flex min-h-11 items-center wrap-anywhere py-2 text-ink underline"
          href={`/training/${programId}/assessor/${chapter.key}#${ASSESSOR_STUDY_PROGRESS_ID}`}>{chapter.title}</Link>
      </li>)}</ul>
      <p className="mt-2 text-sm text-ink/75">{text('Hiwalay ito sa progreso ng mga BHW na sinusuportahan mo.', 'This is separate from the progress of BHWs you support.')}</p>
    </nav>}
  </aside>;
}

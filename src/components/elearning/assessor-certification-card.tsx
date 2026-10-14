import Link from 'next/link';
import {certificateStatusText, certificationCardStatus, type ChapterCertifications} from '@/lib/assessor/certifications';
import {AssessorQualificationCard, type QualificationState} from './assessor-qualification-card';

export function AssessorCertificationCard({chapterKey, chapterId, title, chapterHref, published, readFailed, records, legacyState, locale}: {
  chapterKey: string; chapterId?: string; title: string; chapterHref: string; published: boolean;
  readFailed: boolean; records?: ChapterCertifications; legacyState?: QualificationState; locale: string;
}) {
  const en = locale === 'en';
  const text = (fil: string, english: string) => en ? english : fil;
  const awards = records?.awards ?? [];
  const requirementsUnavailable = published && legacyState?.status === 'unavailable';
  const chapterPathAvailable = published && !requirementsUnavailable;
  const status = certificationCardStatus(chapterKey, published && !requirementsUnavailable, readFailed, awards);
  const label = {certified: text('Sertipikado', 'Certified'), in_progress: text('Isinasagawa', 'In progress'),
    unavailable: text('Hindi pa available', 'Not yet available'), read_failed: text('Hindi mabasa ang katayuan', 'Status could not be read'),
    update_required: text('Kailangan ng pag-update', 'Update required'), suspended: text('Sinuspinde', 'Suspended'), revoked: text('Binawi', 'Revoked')}[status];
  return <article id={chapterKey} className="rounded-xl border border-ink/15 p-5">
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="mt-2 font-medium" role={readFailed ? 'alert' : undefined}>{label}</p>
    {readFailed ? <p className="mt-2 text-sm">{text('Subukan muli. Hindi ito nangangahulugang kulang ang iyong ebidensya.', 'Try again. This does not mean your evidence is incomplete.')}</p> : <>
      {!published && <p className="mt-2 text-sm">{text('Hindi pa nailathala ang kinakailangang nilalaman ng kabanata.', 'Required chapter content is not currently published.')}</p>}
      {requirementsUnavailable && <p className="mt-2 text-sm">{text('Hindi pa available ang aprubadong pagsusulit at oryentasyon.', 'Approved exam and orientation requirements are not yet available.')}</p>}
      {chapterKey === 'chapter-3' && !published && <p className="mt-2 text-sm">{text('Wala pang aprubadong landas ng sertipikasyon para sa Kabanata 3.', 'Chapter 3 has no approved certification path yet.')}</p>}
      {awards.length > 0 && <><p className="mt-2 text-sm">{text('Tala ng pagkamit; hindi pahintulot na kumilos ngayon.', 'Historical achievement; this does not grant current authority.')}</p>
        <ul className="mt-3 space-y-3">{awards.map(award => <li key={award.certificateId}>
          <p>{certificateStatusText(award.status, en)} · {new Date(award.issuedAt).toLocaleDateString(en ? 'en-PH' : 'fil-PH')}</p>
          {chapterKey === 'chapter-1' && <Link prefetch={false} className="underline" href={`/assessor-certificates/${award.certificateId}`}>{text('Tingnan ang sertipiko', 'View certificate')}</Link>}
          {chapterKey === 'chapter-1' && !award.outputAvailable && <p className="text-sm">{text('Napanatili ang pagkamit; hindi pa available ang mga detalye ng sertipiko.', 'Achievement retained; certificate details are not yet available.')}</p>}
        </li>)}</ul></>}
      {(records?.legacy.length ?? 0) > 0 && <div className="mt-4 border-t border-ink/15 pt-3">
        <h3 className="font-medium">{text('Naunang kwalipikasyon', 'Legacy qualification')}</h3>
        <p className="text-sm">{text('Hiwalay ito sa pinagsamang sertipikasyon ng tagatasa/tagapagpadaloy.', 'This is separate from the combined assessor/facilitator certification.')}</p>
        <ul className="mt-2 space-y-2">{records!.legacy.map(q => <li key={q.id} className="text-sm">
          {certificateStatusText(q.status, en)} · {new Date(q.issuedAt).toLocaleDateString(en ? 'en-PH' : 'fil-PH')}<br/>
          {text('Kurikulum', 'Curriculum')}: {q.curriculumVersion} · {text('Oryentasyon', 'Orientation')}: {q.orientationVersion}
        </li>)}</ul>
      </div>}
      {chapterPathAvailable && chapterId && legacyState && !records?.revisedPath && awards.length === 0 && <div className="mt-4">
        <p className="mb-2 text-sm">{text('Landas ng naunang kwalipikasyon — hindi pinagsamang sertipikasyon', 'Legacy qualification path — separate from combined certification')}</p>
        <AssessorQualificationCard chapterId={chapterId} chapterTitle={text('Pag-aaral at oryentasyon', 'Study and orientation')} chapterHref={chapterHref} locale={locale} state={legacyState}/>
      </div>}
      {records?.revisedPath && awards.length === 0 && <p className="mt-3 text-sm">{text('Chini-check ng pinagsamang landas ang pag-aaral, pagsusulit, oryentasyon, at simulation. Walang award na ipinapalagay mula sa naunang kwalipikasyon.', 'The combined path checks study, exams, orientation, and simulation. A legacy qualification is not treated as a combined award.')}</p>}
      {chapterPathAvailable && <Link prefetch={false} className="mt-3 inline-block underline" href={chapterHref}>{text('Buksan ang kabanata', 'Open chapter')}</Link>}
    </>}
  </article>;
}

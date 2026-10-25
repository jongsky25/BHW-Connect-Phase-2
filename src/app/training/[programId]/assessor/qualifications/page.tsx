import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {getLocale} from 'next-intl/server';
import {getViewer} from '@/lib/auth/viewer';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';
import {type QualificationState} from '@/components/elearning/assessor-qualification-card';
import {AssessorCertificationCard} from '@/components/elearning/assessor-certification-card';
import {CHAPTERS, type ChapterCertifications} from '@/lib/assessor/certifications';
import {overallStatusText, type OverallProgress} from '@/lib/assessor/overall-certifications';
import {AssessorProgressGuide} from '@/components/elearning/assessor-progress-navigation';
import {Breadcrumbs} from '@/components/breadcrumbs';

export default async function MyQualificationsPage({params}: {params: Promise<{programId: string}>}) {
  const [{programId}, viewer, flags, locale] = await Promise.all([params, getViewer(), getRequestFeatureFlags(), getLocale()]);
  if (!viewer.appUser || viewer.appUser.status !== 'active') redirect('/login');
  if (!flags.elearning || viewer.role !== 'assessor' || viewer.appUser.role !== 'assessor' || viewer.isPreview) redirect('/home');
  const db = await createClient();
  const [{data: program, error: programError}, {data: chapters, error: chapterError}, history, overall] = await Promise.all([
    db.from('training_programs').select('id').eq('id', programId).eq('content_key', 'bhw-reference-manual').eq('status', 'published').maybeSingle(),
    db.from('training_program_chapters').select('id,chapter_key,title_fil,title_en,availability,course_id')
      .eq('program_id', programId).in('chapter_key', CHAPTERS).order('position').limit(3),
    db.rpc('rpc_assessor_certifications_state', {p_program_id: programId}),
    db.rpc('rpc_assessor_overall_progress', {p_program_id: programId}),
  ]);
  if (programError) throw new Error('Unable to load assessor program');
  if (!program) notFound();
  const records = (history.data ?? []) as ChapterCertifications[];
  const available = (chapters ?? []).filter(c => c.availability === 'available' && c.course_id && records.find(r => r.chapterKey === c.chapter_key)?.publicationAvailable !== false);
  const states = await Promise.all(available.map(c => db.rpc('rpc_assessor_qualification_state', {p_chapter_id: c.id})));
  const en = locale === 'en';
  const text = (fil: string, english: string) => en ? english : fil;
  const progress = !overall.error && !chapterError ? overall.data as OverallProgress | null : null;
  return <section aria-labelledby="my-certifications-title" className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
    <Breadcrumbs items={[{label: 'BHW Reference Manual', href: `/training/${programId}`}, {label: text('Aking mga sertipikasyon', 'My certifications')}]}/>
    <header><h1 id="my-certifications-title" className="text-2xl font-semibold">{text('Aking mga sertipikasyon', 'My certifications')}</h1>
      <p className="mt-2">{text('Hiwalay ang sertipikasyon ng tagatasa/tagapagpadaloy para sa bawat kabanata. Ang Kabanata 1 ay hindi sumasaklaw sa Kabanata 2–3.', 'Assessor/facilitator certification is separate for each chapter. Chapter 1 does not cover Chapters 2–3.')}</p></header>
    <AssessorProgressGuide programId={programId} locale={locale} progress={progress}
      readFailed={!!overall.error || !!chapterError || !!history.error}
      chapters={available.map(c => ({key: c.chapter_key, title: en ? c.title_en : c.title_fil}))}/>
    <article className="rounded-xl border border-ink/15 p-5"><h2 className="text-lg font-semibold">{text('Pangkalahatang progreso', 'Overall progress')}</h2>
      {!progress ? <p className="mt-2" role="alert">{text('Hindi mabasa ang progreso. Subukan muli.', 'Progress could not be read. Try again.')}</p> : <>
        <p className="mt-2">{text(`${progress.qualifiedCount}/3 kasalukuyang katugmang sertipikasyon ng kabanata`, `${progress.qualifiedCount}/3 current compatible chapter certifications`)}</p>
        <ul className="mt-3 space-y-1 text-sm">{progress.chapters.map(item => <li key={item.chapterKey}>
          {text('Kabanata', 'Chapter')} {item.chapterKey.slice(-1)}: {{qualified: text('Katugma', 'Compatible'), missing: text('Kulang', 'Missing'), unavailable: text('Hindi available', 'Unavailable'), await_rule: text('Naghihintay ng tuntunin', 'Awaiting rule'), update_or_resolve: text('Suriin ang bersyon o katayuan', 'Review version or status')}[item.status]}
        </li>)}</ul>
        {!progress.ruleAvailable && <p className="mt-2 text-sm">{text('Hindi pa aktibo ang aprubadong tuntunin para sa pangkalahatang award.', 'No approved overall award rule is active yet.')}</p>}
        {progress.awards.length > 0 && <div className="mt-4 border-t border-ink/15 pt-3"><h3 className="font-medium">{text('Pangkalahatang tala ng pagkamit', 'Overall achievement records')}</h3>
          <ul className="mt-2 space-y-2">{progress.awards.map(award => <li key={award.certificateId} className="text-sm">
            <Link prefetch={false} className="underline" href={`/assessor-overall-certificates/${award.certificateId}`}>{text('Tingnan ang sertipiko', 'View certificate')}</Link> · {overallStatusText(award.status, en)} · {new Date(award.issuedAt).toLocaleDateString(en ? 'en-PH' : 'fil-PH')}
            {!award.outputAvailable && <span className="block">{text('Hindi pa available ang display ng sertipiko.', 'Certificate display is unavailable.')}</span>}
          </li>)}</ul></div>}
      </>}
      <p className="mt-2 text-sm">{text('Kailangan ang tatlong katugmang sertipikasyon. Walang karagdagang pangkalahatang pagsusulit.', 'Three compatible chapter certifications are required. There is no extra overall exam.')}</p>
    </article>
    <div className="grid gap-4">{CHAPTERS.map((key, i) => {
      const chapter = chapters?.find(c => c.chapter_key === key);
      const index = available.findIndex(c => c.chapter_key === key);
      const state = index >= 0 ? states[index] : undefined;
      return <AssessorCertificationCard key={key} chapterKey={key} chapterId={chapter?.id}
        title={chapter ? en ? chapter.title_en : chapter.title_fil : text(`Kabanata ${i + 1}`, `Chapter ${i + 1}`)}
        chapterHref={`/training/${programId}/assessor/${key}`} published={index >= 0}
        readFailed={!!history.error || !!chapterError || !!state?.error} records={records.find(c => c.chapterKey === key)}
        locale={locale} legacyState={state?.data as QualificationState | undefined}/>;
    })}</div>
    <Link prefetch={false} href={`/training/${programId}`} className="self-start py-2 underline">{text('Bumalik sa manwal', 'Back to manual')}</Link>
  </section>;
}

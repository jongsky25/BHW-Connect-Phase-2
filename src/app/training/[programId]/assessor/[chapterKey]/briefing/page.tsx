import {notFound, redirect} from 'next/navigation';
import {getLocale} from 'next-intl/server';
import {getViewer} from '@/lib/auth/viewer';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';
import {loadAssessorRollout} from '@/lib/assessor/load-rollout';
import {chapter1BriefingIdentity} from '@/lib/assessor/briefing';
import {loadBriefingState} from '@/lib/assessor/load-briefing';
import {AssessorBriefing} from '@/components/elearning/assessor-briefing';
import {Breadcrumbs} from '@/components/breadcrumbs';

export default async function BriefingPage({params}: {
  params: Promise<{programId: string; chapterKey: string}>;
}) {
  const [{programId, chapterKey}, viewer, flags, locale] = await Promise.all([
    params, getViewer(), getRequestFeatureFlags(), getLocale(),
  ]);
  if (!viewer.appUser || viewer.appUser.status !== 'active') redirect('/login');
  const preview = viewer.appUser.role === 'admin';
  if (!flags.elearning || (!preview && (viewer.role !== 'assessor' || viewer.appUser.role !== 'assessor' || viewer.isPreview))) redirect('/home');
  if (chapterKey !== 'chapter-1') notFound();
  const base = `/training/${programId}/assessor/chapter-1`;
  // No new database reads when the revised UI is off. Admins can inspect
  // this static briefing without any candidate progress or policy writes.
  if (!preview && !flags.assessor_flow_ui) redirect(base);
  const db = await createClient();
  const [{data: program, error: programError}, {data: chapter, error: chapterError}] = await Promise.all([
    db.from('training_programs').select('id').eq('id', programId).eq('content_key', 'bhw-reference-manual').eq('status', 'published').maybeSingle(),
    db.from('training_program_chapters').select('id').eq('program_id', programId).eq('chapter_key', chapterKey).eq('availability', 'available').maybeSingle(),
  ]);
  if (programError || chapterError) throw new Error('Unable to load assessor briefing');
  if (!program || !chapter) notFound();
  if (!preview) {
    const rollout = await loadAssessorRollout(db, flags, chapter1BriefingIdentity(programId), {actor: {
      id: viewer.appUser.id, role: viewer.appUser.role, active: true, preview: viewer.isPreview,
    }});
    if (!rollout.uiVisible) redirect(base);
  }
  const initial = preview ? null : await loadBriefingState(db, programId, viewer.appUser.id);
  return <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
    <Breadcrumbs items={[{label: 'BHW Reference Manual', href: `/training/${programId}`},
      {label: locale === 'en' ? 'Opening briefing' : 'Panimulang briefing'}]}/>
    <AssessorBriefing locale={locale} chapterHref={base} programId={programId} actorId={viewer.appUser.id} initial={initial} preview={preview}/>
  </main>;
}

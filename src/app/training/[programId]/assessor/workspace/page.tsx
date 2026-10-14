import Link from 'next/link';
import {getLocale} from 'next-intl/server';
import {notFound, redirect} from 'next/navigation';
import {Breadcrumbs} from '@/components/breadcrumbs';
import {ComponentReadinessList} from '@/components/elearning/component-readiness-list';
import {ComponentRequestManager} from '@/components/elearning/component-request-manager';
import {getViewer} from '@/lib/auth/viewer';
import {type ChapterCertifications} from '@/lib/assessor/certifications';
import {parseComponentReadiness} from '@/lib/assessor/component-readiness';
import {parseComponentRequestQueue} from '@/lib/assessor/component-requests';
import {chapter1Terms} from '@/lib/assessor/chapter1-workflow-parity';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';

type Row = {id:string;full_name:string;barangay:string;area_id:string;learning_status:string};
type Area = {id:string;name:string};
type Roster = {rows:Row[];total:number;page:number;pageSize:number;areas:Area[];areasTruncated:boolean};
type Filters = {q?:string;area?:string;status?:string;page?:string;learner?:string};
const statuses = ['all','not_started','in_progress','content_completed','certified','failed_assessment'] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AssessorWorkspace({params,searchParams}:{
  params:Promise<{programId:string}>;searchParams:Promise<Filters>;
}) {
  const [{programId},query,viewer,flags,locale] = await Promise.all([
    params,searchParams,getViewer(),getRequestFeatureFlags(),getLocale(),
  ]);
  if (!viewer.appUser || viewer.appUser.status !== 'active') redirect('/login');
  if (!flags.elearning || viewer.role !== 'assessor' || viewer.appUser.role !== 'assessor' || viewer.isPreview) redirect('/home');
  const en = locale === 'en';
  const label = (fil:string,english:string) => en ? english : fil;
  const search = (query.q ?? '').trim().slice(0,80);
  const area = query.area && uuid.test(query.area) ? query.area : null;
  const status = statuses.find(value => value === query.status) ?? 'all';
  const page = Math.min(Math.max(Number.parseInt(query.page ?? '1',10) || 1,1),10000);
  const db = await createClient();
  const [{data:program,error:programError},{data:chapter,error:chapterError},rosterResult,certifications] = await Promise.all([
    db.from('training_programs').select('id,title_fil,title_en').eq('id',programId)
      .eq('content_key','bhw-reference-manual').eq('status','published').maybeSingle(),
    db.from('training_program_chapters').select('id,course_id,title_fil,title_en')
      .eq('program_id',programId).eq('chapter_key','chapter-1').eq('availability','available').maybeSingle(),
    db.rpc('rpc_assessor_chapter1_workspace', {p_program_id:programId,p_search:search || null,
      p_area_id:area,p_status:status,p_page:page}),
    db.rpc('rpc_assessor_certifications_state',{p_program_id:programId}),
  ]);
  if (programError || chapterError) throw new Error('Unable to load Chapter 1 workspace');
  if (!program || !chapter?.course_id) notFound();
  const {data:communicationModule,error:moduleError} = await db.from('course_modules').select('id')
    .eq('course_id',chapter.course_id).eq('position',5).maybeSingle();
  const {data:clarifyLesson} = communicationModule && !moduleError
    ? await db.from('course_lessons').select('id').eq('module_id',communicationModule.id)
      .eq('lesson_key','communication-clarify').not('published_revision_id','is',null).maybeSingle()
    : {data:null};
  const base = `/training/${programId}/assessor/workspace`;
  const href = (changes:Record<string,string|null>) => {
    const values = new URLSearchParams();
    if (search) values.set('q',search);
    if (area) values.set('area',area);
    if (status !== 'all') values.set('status',status);
    if (page > 1) values.set('page',String(page));
    for (const [key,value] of Object.entries(changes)) {
      if (value) values.set(key,value);
      else values.delete(key);
    }
    const suffix = values.toString();
    return `${base}${suffix ? `?${suffix}` : ''}`;
  };
  const lessonHref = (returnPath:string) => clarifyLesson && communicationModule
    ? `/training/${programId}/chapter-1/${communicationModule.id}/${clarifyLesson.id}?${new URLSearchParams({view:'prepare',returnTo:returnPath})}` : null;
  const roster = rosterResult.data as Roster | null;
  const rosterError = !!rosterResult.error || !roster;
  const records = (certifications.data ?? []) as ChapterCertifications[];
  const award = records.find(record => record.chapterKey === 'chapter-1')?.awards[0];
  const selected = query.learner && uuid.test(query.learner)
    ? roster?.rows.find(row => row.id === query.learner) : undefined;
  const readinessResult=selected&&flags.assessor_flow_ui
    ?await db.rpc('rpc_assessor_component_readiness',{p_program_id:programId,p_bhw_user_id:selected.id})
    :null;
  const readiness=readinessResult&&!readinessResult.error?parseComponentReadiness(readinessResult.data):null;
  const queueResult=flags.assessor_flow_ui
    ?await db.rpc('rpc_assessor_component_request_queue',{p_program_id:programId}):null;
  const queue=queueResult&&!queueResult.error?parseComponentRequestQueue(queueResult.data):null;
  const statusLabel = (value:string) => ({
    not_started:label('Hindi pa nagsimula','Not started'),
    in_progress:label('Nag-aaral','Learning in progress'),
    content_completed:label('Natapos ang nilalaman','Content completed'),
    certified:label('May naitalang sertipiko','Certificate recorded'),
    failed_assessment:label('May naitalang hindi naipasang pagtatasa','Assessment outcome recorded'),
  } as Record<string,string>)[value] ?? label('Hindi matukoy','Unknown');
  const card = 'rounded-xl border border-ink/15 p-5';
  return <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
    <Breadcrumbs items={[{label:label('Manwal ng BHW','BHW Reference Manual'),href:`/training/${programId}`},
      {label:chapter1Terms.workspace[en?'en':'fil']}]}/>
    <header>
      <h1 className="text-2xl font-semibold sm:text-3xl">{chapter1Terms.workspace[en?'en':'fil']}</h1>
      <p className="mt-2 text-ink/75">{label('Paghahanda, mga BHW sa iyong lugar, at kasalukuyang gawaing pagtatasa.',
        'Preparation, BHWs in your area, and current assessment work.')}</p>
    </header>
    <nav className="flex flex-wrap gap-3" aria-label={label('Mga bahagi ng working area','Working area sections')}>
      <a className="rounded-md border px-3 py-2 underline" href="#preparation">{label('Aking paghahanda','My preparation')}</a>
      <a className="rounded-md border px-3 py-2 underline" href="#roster">{label('Mga BHW na sinusuportahan ko','BHWs I support')}</a>
      <a className="rounded-md border px-3 py-2 underline" href="#assessment-work">{label('Aking gawaing pagtatasa','My assessment work')}</a>
    </nav>
    <section id="preparation" className={card} aria-labelledby="preparation-title">
      <h2 id="preparation-title" className="text-xl font-semibold">{label('Aking paghahanda','My preparation')}</h2>
      <p className="mt-2">{label('Maaari mong balikan ang pag-aaral, gabay, oryentasyon at fictional simulation anumang oras.',
        'You can revisit your study, guides, orientation, and fictional simulation at any time.')}</p>
      <p className="mt-3 text-sm">{certifications.error
        ? label('Hindi mabasa ang kasalukuyang sertipikasyon. Subukang muli; bukas pa rin ang paghahanda.',
          'Current certification could not be read. Try again; preparation remains available.')
        : award ? `${label('Tala ng Chapter 1 award','Chapter 1 award record')}: ${award.status}. ${label('Hindi ito nag-iisang pahintulot para sa isang opisyal na gawain.',
          'This record alone is not permission for an official action.')}`
          : label('Wala pang pinagsamang Chapter 1 award. Tapusin ang kinakailangang paghahanda at tingnan ang My certifications para sa mga kulang.',
            'No combined Chapter 1 award yet. Complete preparation and check My certifications for blockers.')}</p>
      <div className="mt-4 flex flex-wrap gap-4">
        <Link prefetch={false} className="underline" href={`/training/${programId}/assessor/chapter-1`}>{label('Ipagpatuloy ang paghahanda','Continue preparation')}</Link>
        <Link prefetch={false} className="underline" href={`/training/${programId}/assessor/qualifications`}>{label('Aking mga sertipikasyon','My certifications')}</Link>
        <Link prefetch={false} className="underline" href={`/training/${programId}/chapter-1`}>{label('Buksan ang gabay ng kabanata','Open chapter guide')}</Link>
        {lessonHref(base) && <Link prefetch={false} className="underline" href={lessonHref(base)!}>{label('Ihanda ang aralin 1.6.2','Prepare lesson 1.6.2')}</Link>}
      </div>
    </section>
    <section id="roster" className={card} aria-labelledby="roster-title">
      <h2 id="roster-title" className="text-xl font-semibold">{chapter1Terms.roster[en?'en':'fil']}</h2>
      <p className="mt-2 text-sm text-ink/75">{label('Mga aktibong BHW lamang sa iyong saklaw. Ang katayuan ng pag-aaral ay hindi pasya sa kahandaan sa pagtatasa.',
        'Only active BHWs in your catchment. Learning status is not an assessment-readiness decision.')}</p>
      <form action={base} method="get" className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="grid gap-1 text-sm">{label('Pangalan o barangay','Name or barangay')}
          <input className="min-h-11 rounded border bg-canvas px-3" name="q" defaultValue={search} maxLength={80}/></label>
        <label className="grid gap-1 text-sm">{label('Lugar','Area')}
          <select className="min-h-11 rounded border bg-canvas px-3" name="area" defaultValue={area ?? ''}>
            <option value="">{label('Lahat sa aking saklaw','All in my catchment')}</option>
            {(roster?.areas ?? []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
        <label className="grid gap-1 text-sm">{label('Pag-aaral','Learning status')}
          <select className="min-h-11 rounded border bg-canvas px-3" name="status" defaultValue={status}>
            {statuses.map(value => <option key={value} value={value}>{value === 'all' ? label('Lahat','All') : statusLabel(value)}</option>)}
          </select></label>
        <button className="min-h-11 self-end rounded bg-primary px-4 text-on-primary" type="submit">{label('Hanapin','Search')}</button>
      </form>
      {roster?.areasTruncated && <p className="mt-2 text-sm text-ink/70">{label('Ipinapakita ang unang 200 barangay. Maaari ring maghanap ayon sa pangalan ng barangay.',
        'Showing the first 200 barangays. You can also search by barangay name.')}</p>}
      {rosterError ? <p role="alert" className="mt-4">{label('Hindi mabasa ang roster. Subukang muli.', 'Roster could not be loaded. Try again.')}</p>
        : <>
          <p className="mt-4 text-sm">{label(`${roster.total} tumugma`,`${roster.total} matching BHWs`)}</p>
          {!roster.rows.length && <p className="mt-3">{search || area || status !== 'all'
            ? label('Walang tugma sa mga filter. Subukan ang ibang hanap.', 'No BHWs match these filters. Try another search.')
            : label('Wala pang aktibong BHW sa iyong saklaw.', 'No active BHWs in your catchment yet.')}</p>}
          {selected && <aside className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4" aria-label={label('Napiling BHW','Selected BHW')}>
            <h3 className="font-semibold">{selected.full_name} · {selected.barangay}</h3>
            <p className="mt-1 text-sm">{statusLabel(selected.learning_status)}</p>
            <p className="mt-2 text-sm">{label('Tingnan ang mga gabay sa paghahanda bago mag-ayos ng aktuwal na gawain. Hindi sinusuri ng pahinang ito ang pormal na kahandaan.',
              'Review the preparation guides before arranging actual work. This page does not determine formal readiness.')}</p>
            {lessonHref(href({learner:selected.id})) && <Link prefetch={false} className="mt-3 mr-4 inline-block underline" href={lessonHref(href({learner:selected.id}))!}>{label('Ihanda ang aralin 1.6.2 kasama ang kontekstong ito','Prepare lesson 1.6.2 with this context')}</Link>}
            {flags.assessor_flow_ui&&<Link prefetch={false} className="mt-3 mr-4 inline-block underline"
              href={`/training/${programId}/assessor/review?learner=${selected.id}`}>
              {label('Suriin ang ebidensya ng Kabanata 1','Review Chapter 1 evidence')}</Link>}
            <Link prefetch={false} className="mt-3 inline-block underline" href={href({learner:null})}>{label('Bumalik sa listahan','Back to list')}</Link>
          </aside>}
          {selected&&flags.assessor_flow_ui&&<section className="mt-4 rounded-md border border-ink/20 p-4" aria-label={label('Kahandaan ng mga bahagi','Component readiness')}>
            <h3 className="text-lg font-semibold">{label('Kahandaan ni','Readiness for')} {selected.full_name}</h3>
            {readiness?<ComponentReadinessList components={readiness} lang={en?'en':'fil'}/>
              :<p role="alert" className="mt-2">{label('Hindi mabasa ang kahandaan ngayon. Subukang muli.',
                'Readiness could not be loaded. Try again.')}</p>}
          </section>}
          <ul className="mt-4 divide-y rounded-md border border-ink/15">{roster.rows.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><p className="font-medium">{row.full_name} · {row.barangay}</p><p className="text-sm text-ink/70">{statusLabel(row.learning_status)}</p></div>
            <Link prefetch={false} className="min-h-11 content-center underline" href={href({learner:row.id})}>{label('Tingnan','View')}</Link>
          </li>)}</ul>
          <nav className="mt-4 flex items-center gap-4" aria-label={label('Mga pahina ng roster','Roster pages')}>
            {page > 1 && <Link prefetch={false} className="underline" href={href({page:String(page-1),learner:null})}>{label('Nakaraan','Previous')}</Link>}
            <span>{label('Pahina','Page')} {page}</span>
            {page * roster.pageSize < roster.total && <Link prefetch={false} className="underline" href={href({page:String(page+1),learner:null})}>{label('Susunod','Next')}</Link>}
          </nav>
        </>}
    </section>
    <section id="assessment-work" className={card} aria-labelledby="assessment-title">
      <h2 id="assessment-title" className="text-xl font-semibold">{label('Aking gawaing pagtatasa','My assessment work')}</h2>
      {flags.assessor_flow_ui&&<Link prefetch={false} className="mt-3 inline-block min-h-11 content-center underline"
        href={`/training/${programId}/assessor/followups`}>{label('Mga follow-up sa pagsasanay','Practice follow-ups')}</Link>}
      {flags.assessor_flow_ui&&(queue?<ComponentRequestManager programId={programId}
        learnerId={selected?.id??null} readiness={readiness} queue={queue} lang={en?'en':'fil'}/>
        :<p role="alert" className="mt-2">{label('Hindi mabasa ang mga kahilingan ngayon.','Assessment requests could not be loaded.')}</p>)}
      {!flags.assessor_flow_ui&&<p className="mt-2">{label('Hindi pa bukas ang bagong daloy ng pagtatasa.','The new assessment flow is not open yet.')}</p>}
      {flags.chapter1_assessment_v2 && <Link prefetch={false} className="mt-3 inline-block underline"
        href={`/courses/${chapter.course_id}/learning-notes/reviewer`}>
        {label('Tingnan ang mga nakatalagang ibinahaging learning note','View assigned shared learning notes')}
      </Link>}
    </section>
  </main>;
}

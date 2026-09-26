import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { lessonActivities } from '@/lib/elearning/activities';
import type { CourseModuleFacilitatorNotes } from '@/lib/elearning/types';
import {getLocale} from 'next-intl/server';
import {notFound,redirect} from 'next/navigation';
import {Breadcrumbs} from '@/components/breadcrumbs';
import {LessonAssetFigure} from '@/components/elearning/lesson-asset-figure';
import {ManualLesson} from '@/components/elearning/manual-lesson';
import {ChapterTestInsights,LessonFacilitatorGuide,SubchapterFacilitatorGuide,type SubchapterGuideView} from '@/components/elearning/facilitator-guide';
import {CardProgress,subchapterSegments} from '@/components/progress/card-progress';
import {ChapterSteps} from '@/components/progress/chapter-steps';
import {ManualSummary} from '@/components/progress/manual-summary';
import {ProgressBar} from '@/components/progress/progress-bar';
import {LessonStatus,StatusChip} from '@/components/progress/status-chip';
import {loadManualProgress} from '@/lib/progress/load-manual-progress';
import {loadChapterTestItems,loadLessonGuide,loadSubchapterGuide} from '@/lib/elearning/load-facilitator-guide';
import {createClient} from '@/lib/supabase/server';
import {getRequestAppUser,getRequestAuthUser,getRequestFeatureFlags} from '@/lib/supabase/request';
import type {CourseLesson,CourseLessonRevision,CourseLessonProgress,CourseLessonResume,CourseModule,TrainingProgramChapter} from '@/lib/elearning/types';
import communication from '../../../../../content/training/day1-basic-competencies/modules/06-komunikasyon/module.json';
import problems from '../../../../../content/training/day1-basic-competencies/modules/07-problema/module.json';
import safety from '../../../../../content/training/day1-basic-competencies/modules/08-osh/module.json';
import practices from '../../../../../content/training/day1-basic-competencies/modules/09-sustainable-practices/module.json';
import narrationManifest from '../../../../../content/training/day1-basic-competencies/narration.json';
import {narrationForLesson,type ReferenceNarrationManifest} from '@/lib/elearning/reference-narration';

const card='block rounded-xl border border-ink/15 p-5 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-primary';

export default async function TrainingPage({params,searchParams}:{params:Promise<{programId:string;path?:string[]}>;searchParams?:Promise<{view?:string;mode?:string}>}) {
  const [{programId,path=[]},{view,mode}]=await Promise.all([params,searchParams??Promise.resolve({view:undefined,mode:undefined})]);
  if(path.length>3)notFound();
  const db=await createClient();
  // Independent reads run together; checks keep their original order.
  const [flags,{data:{user}}]=await Promise.all([getRequestFeatureFlags(),getRequestAuthUser()]);
  if(!flags.elearning)redirect('/home');
  if(!user)redirect('/login');
  const actor=await getRequestAppUser(user.id);
  if(!actor || actor.status!=='active')redirect('/login');
  const readOnly=actor.role!=='bhw';
  // Facilitator guide: private notes, competency and the area's BHWs. RLS
  // limits every guide read to these two roles; designers keep the preview.
  const facilitator=actor.role==='assessor'||actor.role==='admin';
  // Personal progress is for BHWs on the manual, chapter and subchapter pages;
  // admins get a preview. Started now so it overlaps the reads below. A
  // failure only hides the progress view — the manual itself still renders.
  const myProgress=!readOnly && path.length<3?loadManualProgress(db,actor.id,programId)
    .then(all=>all[0]??null,error=>{Sentry.captureException(error);return null;}):Promise.resolve(null);
  const [locale,{data:program,error:programError},{data:chapters,error:chapterError}]=await Promise.all([
    getLocale(),
    db.from('training_programs').select('id,content_key,title_fil,title_en').eq('id',programId).eq('status','published').maybeSingle(),
    db.from('training_program_chapters').select('*').eq('program_id',programId).order('position').returns<TrainingProgramChapter[]>(),
  ]);
  const en=locale==='en';
  const loc=en?'en':'fil';
  const text=(fil:string,eng:string)=>en?eng:fil;
  const title=(r:{title_fil:string;title_en:string})=>en?r.title_en:r.title_fil;
  if(programError)throw new Error('Unable to load training program');
  if(!program)notFound();
  if(chapterError)throw new Error('Unable to load training chapters');
  const manualTitle=program.content_key==='bhw-reference-manual'?'BHW Reference Manual':title(program);
  const base=`/training/${programId}`;
  const crumbs:Array<{label:string;href?:string}>=[{label:'Home',href:'/home'},{label:text('Mga Kurso','Courses'),href:'/courses'},
    {label:manualTitle,...(path.length?{href:base}:{})}];
  const chapter=path.length?chapters?.find(c=>c.chapter_key===path[0]):null;
  if(path.length && (!chapter || chapter.availability!=='available' || !chapter.course_id))notFound();
  let content:React.ReactNode;
  let heading=manualTitle;
  let intro=text('Piliin ang kabanatang nais mong pag-aralan.','Choose a chapter to explore.');
  if(!chapter) {
    const mine=await myProgress;
    content=<>
      {mine && mine.counts.total>0 && <ManualSummary progress={mine} title={manualTitle} locale={loc}/>}
      <div className="grid gap-4">{chapters?.map(c=>{
        const p=mine?.chapters.find(x=>x.id===c.id);
        return <div key={c.id}>
          {c.availability==='available' && c.course_id ? <Link className={card} href={`${base}/${c.chapter_key}`}>
            <span className="text-sm text-ink/70">{text('Kabanata','Chapter')} {c.position+1}</span>
            <h2 className="mt-1 text-xl font-semibold">{title(c)}</h2>
            {p && <CardProgress state={p.state} counts={p.counts} locale={loc} segments={subchapterSegments(p,loc)}
              label={text(`Progreso sa Kabanata ${c.position+1}`,`Chapter ${c.position+1} progress`)}/>}
            <p className="mt-3 text-sm">{text('Tingnan ang mga subchapter →','Explore subchapters →')}</p>
          </Link>:<div className="rounded-xl border border-ink/15 p-5">
            <span className="text-sm text-ink/70">{text('Kabanata','Chapter')} {c.position+1}</span>
            <h2 className="mt-1 text-xl font-semibold">{title(c)}</h2>
            <div className="mt-3"><StatusChip state="unavailable" locale={loc}/></div>
          </div>}
        </div>;
      })}</div>
    </>;
  } else {
    const chapterHref=`${base}/${chapter.chapter_key}`;
    const chapterTitle=`${text('Kabanata','Chapter')} ${chapter.position+1}: ${title(chapter)}`;
    crumbs.push({label:chapterTitle,...(path.length>1?{href:chapterHref}:{})});
    heading=chapterTitle;
    intro=text('Piliin ang isang subchapter. Bawat aralin ay isang maikling bahagi lamang.','Choose a subchapter. Each lesson covers one short part.');
    const courseId=chapter.course_id!;
    // Course, subchapters and progress all key off the chapter's course id,
    // so they load together; lessons and completions follow in one more batch.
    const [{data:course,error:courseError},{data:modules,error:moduleError},{data:progress,error:progressError}]=await Promise.all([
      db.from('courses').select('id').eq('id',courseId).eq('status','published').maybeSingle(),
      // Do not fetch or serialize old long bodies in the manual experience.
      db.from('course_modules').select('id,course_id,position,type,title_fil,title_en,objectives_fil,objectives_en').eq('course_id',courseId).order('position'),
      db.from('course_progress').select('id,status').eq('course_id',courseId).eq('bhw_user_id',actor.id).maybeSingle(),
    ]);
    if(courseError)throw new Error('Unable to load chapter');
    if(!course)notFound();
    if(moduleError)throw new Error('Unable to load subchapters');
    if(progressError)throw new Error('Unable to load your progress');
    const [{data:lessons,error:lessonError},{data:completed,error:completedError}]=await Promise.all([
      modules?.length?db.from('course_lessons').select('*')
        .in('module_id',modules.map(m=>m.id)).not('published_revision_id','is',null).order('position').returns<CourseLesson[]>():Promise.resolve({data:[] as CourseLesson[],error:null}),
      progress?db.from('course_lesson_progress').select('*').eq('course_progress_id',progress.id)
        .returns<CourseLessonProgress[]>():Promise.resolve({data:[] as CourseLessonProgress[],error:null}),
    ]);
    if(lessonError)throw new Error('Unable to load lessons');
    if(completedError)throw new Error('Unable to load completed lessons');
    const done=new Set(completed?.map(p=>p.lesson_id));
    const subchapter=path[1]?modules?.find(m=>m.id===path[1]):null;
    if(path[1] && !subchapter)notFound();
    const assessmentHref=`/courses/${course.id}?assessment=1`;
    if(!subchapter) {
      const {data:certificate,error:certificateError}=progress?.status==='certified'?await db.from('certificates').select('verification_code')
        .eq('course_id',course.id).eq('bhw_user_id',actor.id).maybeSingle():{data:null,error:null};
      if(certificateError)throw new Error('Unable to load your certificate');
      const mine=(await myProgress)?.chapters.find(x=>x.id===chapter.id);
      const testItems=facilitator?await loadChapterTestItems(db,course.id):null;
      content=<>
        {mine && <section className="flex flex-col gap-4 rounded-xl border border-ink/15 p-5" aria-labelledby="chapter-progress">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="chapter-progress" className="font-semibold">{text('Ang iyong progreso','Your progress')}</h2>
            <StatusChip state={mine.state} locale={loc}/>
          </div>
          {mine.counts.total>0 && <ProgressBar counts={mine.counts} state={mine.state} label={chapterTitle} locale={loc} segments={subchapterSegments(mine,loc)}/>}
          <ChapterSteps steps={mine.steps} locale={loc}/>
        </section>}
        <div className="grid gap-3">{modules?.filter(m=>m.type!=='quiz').map((m,i)=>{
          const own=lessons?.filter(l=>l.module_id===m.id)??[];
          const sub=mine?.subchapters.find(x=>x.id===m.id);
          return <Link key={m.id} className={card} href={`${chapterHref}/${m.id}`}>
            <h2 className="text-lg font-semibold">{chapter.position+1}.{i+1} {title(m)}</h2>
            {sub && own.length ? <CardProgress state={sub.state} counts={sub.counts} locale={loc} label={text(`Progreso sa ${sub.number}`,`${sub.number} progress`)}/>:
              <p className="mt-2 text-sm text-ink/70">{own.length ? `${own.length} ${text('maiikling aralin','short lessons')}`:text('Inihahanda ang maiikling aralin','Short lessons are being prepared')}</p>}
          </Link>;
        })}
        {program.content_key==='bhw-reference-manual' && chapter.chapter_key==='chapter-1' && [communication,problems,safety,practices].filter(m=>!modules?.some(row=>row.position===m.position)).map(m=><div key={m.id} className="rounded-xl border border-ink/15 p-5">
          <h2 className="text-lg font-semibold">1.{m.position+1} {title(m)}</h2><div className="mt-2"><StatusChip state="unavailable" locale={loc}/></div>
        </div>)}</div>
        {testItems && <ChapterTestInsights lang={loc} {...testItems}/>}
        {readOnly?<p>{text('Preview lamang. Hindi binabago ang progreso ng mga mag-aaral.','Preview only. Learner progress is not changed.')}</p>:
          <section className="rounded-xl border border-ink/15 p-5" aria-label={text('Pagtatasa at sertipiko','Assessment and certificate')}>
            <h2 className="font-semibold">{text('Pagtatasa at sertipiko ng kabanatang ito','This chapter’s assessment and certificate')}</h2>
            {certificate?<><p className="my-2">{text('Sertipikado ka na. Maaari mong balikan ang mga aralin nang hindi nawawala ang iyong sertipiko.','You are certified. You can review lessons without losing your certificate.')}</p><Link className="underline" href={`/certificates/${certificate.verification_code}`}>{text('Tingnan ang sertipiko','View certificate')}</Link></>:
              <Link className="mt-3 inline-block underline" href={assessmentHref}>{text('Tingnan ang pagtatasa','View assessment')}</Link>}
          </section>}
      </>;
    } else {
      const moduleHref=`${chapterHref}/${subchapter.id}`;
      crumbs.push({label:title(subchapter),...(path.length>2?{href:facilitator?`${moduleHref}?view=slides`:moduleHref}:{})});
      heading=title(subchapter);
      const own=lessons?.filter(l=>l.module_id===subchapter.id)??[];
      intro=own.length?text('Piliin ang isang maikling aralin.','Choose a short lesson.'):text('Inihahanda pa ang mga aralin para sa subchapter na ito.','Lessons for this subchapter are being prepared.');
      const lesson=path[2]?own.find(l=>l.id===path[2]):null;
      if(path[2] && !lesson)notFound();
      if(!lesson) {
        const mine=(await myProgress)?.chapters.find(x=>x.id===chapter.id)?.subchapters.find(x=>x.id===subchapter.id);
        const started=new Map(mine?.lessons.map(l=>[l.id,l.state]));
        const guideView:SubchapterGuideView=view==='competency'||view==='activities'||view==='run'||view==='bhws'||view==='slides'?view:'learning';
        const guide=facilitator?await loadSubchapterGuide(db,{courseId:course.id,moduleId:subchapter.id,lessons:own,lang:loc,
          lessonHref:id=>`${moduleHref}/${id}`,includeRoster:guideView==='bhws'}):null;
        if(guide)intro=text('Pumili ng bahagi ng gabay o buksan ang BHW Slides.','Choose a guide section or open BHW Slides.');
        const lessonCards=<ol className="grid gap-3">{own.map((l,i)=><li key={l.id}><Link className={card} href={guide?`${moduleHref}/${l.id}?view=lesson&mode=slides`:`${moduleHref}/${l.id}`}>
          <h2 className="font-semibold">{i+1}. {title(l)}</h2>
          <p className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            <span className="text-ink/70">{text(`Aralin ${i+1} sa ${own.length}`,`Lesson ${i+1} of ${own.length}`)} · {text('Basahin / Slides','Read / Slides')}</span>
            {!readOnly && <LessonStatus state={started.get(l.id)??(done.has(l.id)?'completed':'not_started')} locale={loc}/>}
          </p>
        </Link></li>)}</ol>;
        content=<>
          {guide ? <SubchapterFacilitatorGuide lang={loc} moduleId={subchapter.id} objectives={en?subchapter.objectives_en??[]:subchapter.objectives_fil??[]}
            view={guideView} href={moduleHref} slidesContent={lessonCards} {...guide}/> : <>
            {mine && mine.counts.total>0 && <ProgressBar counts={mine.counts} state={mine.state} locale={loc} label={text(`Progreso sa ${title(subchapter)}`,`Progress in ${title(subchapter)}`)}/>}
            {lessonCards}
          </>}
        </>;
      } else {
        // Keep the existing pretest gate. Certified learners can review without retaking tests.
        const achieved=['certified','content_completed','failed_assessment'].includes(progress?.status??'');
        const pretestGate=!readOnly && flags.course_sessions && !achieved;
        const showGuide=facilitator && view!=='lesson';
        // The pretest check and the lesson content are independent reads, so
        // they share one round trip; the redirect still wins if it applies.
        const [bank,attempt,revisionResult,resumeResult,notes,activityNotes]=await Promise.all([
          pretestGate?db.from('course_test_questions_current').select('id').eq('course_id',course.id).limit(1):Promise.resolve({data:null,error:null}),
          pretestGate?db.from('course_test_attempts').select('id').eq('course_id',course.id).eq('bhw_user_id',actor.id).eq('phase','pretest').maybeSingle():Promise.resolve({data:null,error:null}),
          db.from('course_lesson_revisions').select('id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by,created_at')
            .eq('id',lesson.published_revision_id!).single<CourseLessonRevision>(),
          progress?db.from('course_lesson_resume').select('*').eq('course_progress_id',progress.id).eq('lesson_id',lesson.id).returns<CourseLessonResume[]>():Promise.resolve({data:[],error:null}),
          facilitator?loadLessonGuide(db,lesson.published_revision_id!):Promise.resolve(null),
          showGuide?db.from('course_module_facilitator_notes').select('activities').eq('module_id',subchapter.id).maybeSingle<Pick<CourseModuleFacilitatorNotes,'activities'>>():Promise.resolve({data:null,error:null}),
        ]);
        if(activityNotes.error)throw new Error('Unable to load activities');
        if(pretestGate){
          if(bank.error||attempt.error)throw new Error('Unable to check assessment eligibility');
          if(bank.data?.length && !attempt.data)redirect(assessmentHref);
        }
        crumbs.push({label:title(lesson)});
        heading=title(lesson); intro=readOnly&&!showGuide?text('Preview lamang — hindi sine-save ang progreso.','Preview only — progress is not saved.'):'';
        if(revisionResult.error || resumeResult.error || !revisionResult.data)throw new Error('Unable to load lesson');
        const revision=revisionResult.data;
        const featured=revision.featured_asset_id?revision.assets.find(a=>a.id===revision.featured_asset_id):undefined;
        const lessonIndex=own.findIndex(l=>l.id===lesson.id);
        const adjacentHref=(id:string)=>`${moduleHref}/${id}${facilitator&&!showGuide?`?view=lesson${mode==='slides'?'&mode=slides':''}`:''}`;
        const tab=(active:boolean)=>`min-h-[44px] rounded-md px-4 py-2 font-medium ${active?'bg-primary text-on-primary':'border border-ink/20'}`;
        content=<>
          {facilitator && <nav className="flex flex-wrap gap-2" aria-label={text('Paraan ng pagtingin','View')}>
            <Link className={tab(showGuide)} aria-current={showGuide?'page':undefined} href={`${moduleHref}/${lesson.id}`}>{text('Gabay ng facilitator','Facilitator guide')}</Link>
            <Link className={tab(!showGuide)} aria-current={!showGuide?'page':undefined} href={`${moduleHref}/${lesson.id}?view=lesson`}>{text('Nakikita ng BHW','As the BHW sees it')}</Link>
          </nav>}
          {showGuide ? <>
            {featured && <section className="rounded-xl border border-ink/15 p-4 sm:p-6" aria-label={text('Panoorin','Watch')}>
              <p className="mb-1 text-sm font-semibold">{text('Panoorin','Watch')}</p>
              <LessonAssetFigure asset={featured} en={en}/>
            </section>}
            <LessonFacilitatorGuide lang={loc} activities={lessonActivities(activityNotes.data?.activities??[],lesson.lesson_key)} notesMarkdown={notes?(en?notes.notes_en:notes.notes_fil):null}
              indicators={notes?.observation_indicators??[]} objectives={(en?lesson.objectives_en:lesson.objectives_fil)??[]}/>
          </> : <ManualLesson data={{title_fil:program.title_fil,title_en:program.title_en,chapters:[],lessons:[{...lesson,revision}],completed:completed??[],resumes:resumeResult.data??[]}}
          modules={[subchapter as CourseModule]} lessonId={lesson.id} baseHref={moduleHref} locale={en?'en':'fil'} readOnly={readOnly} lessonNumber={lessonIndex+1} lessonCount={own.length}
          returnHref={facilitator?`${moduleHref}?view=slides`:undefined}
          initialMode={facilitator && mode==='slides'?'slides':undefined}
          nextLessonHref={own[lessonIndex+1]?adjacentHref(own[lessonIndex+1].id):undefined}
          narration={program.content_key==='bhw-reference-manual'?narrationForLesson(narrationManifest as ReferenceNarrationManifest,lesson.lesson_key,en?'en':'fil'):undefined}/>}
          <nav className="flex flex-wrap justify-between gap-4" aria-label={text('Mga aralin sa subchapter','Subchapter navigation')}>
            {own[lessonIndex-1] && <Link className="rounded border p-3" href={adjacentHref(own[lessonIndex-1].id)}>{text('← Nakaraang aralin','← Previous lesson')}</Link>}
            {own[lessonIndex+1] && <Link className="rounded border p-3" href={adjacentHref(own[lessonIndex+1].id)}>{text('Susunod na aralin →','Next lesson →')}</Link>}
          </nav></>;
      }
    }
  }
  return <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
    <Breadcrumbs items={crumbs}/><header><h1 className="text-2xl font-semibold sm:text-3xl">{heading}</h1>{intro&&<p className="mt-2 text-ink/70">{intro}</p>}</header>
    {content}
  </div>;
}

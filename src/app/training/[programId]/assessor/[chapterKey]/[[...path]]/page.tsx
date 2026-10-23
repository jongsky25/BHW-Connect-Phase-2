import {parseSimulationState} from '@/lib/assessor/simulation-runner';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {getLocale} from 'next-intl/server';
import {getViewer} from '@/lib/auth/viewer';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';
import {chapterStudy,studyReaderData,type StudyCompletion,type StudyResume} from '@/lib/assessor/learning';
import {referenceManualChapter} from '@/lib/assessor/curriculum';
import {loadAssessorRollout} from '@/lib/assessor/load-rollout';
import {chapter1BriefingIdentity} from '@/lib/assessor/briefing';
import {loadBriefingState} from '@/lib/assessor/load-briefing';
import {preparationQualification} from '@/lib/assessor/preparation-checklist';
import {AssessorPreparationChecklist} from '@/components/elearning/assessor-preparation-checklist';
import {ManualLesson} from '@/components/elearning/manual-lesson';
import {AssessorExam} from '@/components/elearning/assessor-exam';
import {Chapter1Assessment} from '@/components/elearning/chapter1-assessment';
import {Chapter1MajorIntroduction} from '@/components/elearning/chapter1-major-introduction';
import {Breadcrumbs} from '@/components/breadcrumbs';
import type {CourseLesson,CourseLessonRevision,CourseModule} from '@/lib/elearning/types';
import narrationManifest from '../../../../../../../content/training/day1-basic-competencies/narration.json';
import chapter1Orientation from '../../../../../../../content/training/day1-basic-competencies/learner-assessment-v2/orientation.json';
import chapter1Checkpoints from '../../../../../../../content/training/day1-basic-competencies/learner-assessment-v2/checkpoints.json';
import {narrationForLesson,type ReferenceNarrationManifest} from '@/lib/elearning/reference-narration';

export default async function AssessorStudyPage({params}:{params:Promise<{programId:string;chapterKey:string;path?:string[]}>}) {
  const [{programId,chapterKey,path=[]},viewer,flags,locale]=await Promise.all([params,getViewer(),getRequestFeatureFlags(),getLocale()]);
  if(!viewer.appUser || viewer.appUser.status!=='active')redirect('/login');
  if(!flags.elearning || viewer.role!=='assessor' || viewer.appUser.role!=='assessor' || viewer.isPreview)redirect('/home');
  if(path.length>2 || !['chapter-1','chapter-2'].includes(chapterKey))notFound();
  const examPage=path[0]==='exam';
  const examPhase=examPage?path[1]:undefined;
  if(examPage && (path.length!==2 || !['pretest','posttest'].includes(examPhase??'')))notFound();
  const curriculum=referenceManualChapter(chapterKey);
  const db=await createClient();
  const en=locale==='en';
  const text=(fil:string,english:string)=>en?english:fil;
  const title=(item:{title_fil:string;title_en:string})=>en?item.title_en:item.title_fil;
  const [{data:program,error:programError},{data:chapter,error:chapterError}]=await Promise.all([
    db.from('training_programs').select('id,title_fil,title_en').eq('id',programId).eq('content_key','bhw-reference-manual').eq('status','published').maybeSingle(),
    db.from('training_program_chapters').select('id,course_id,title_fil,title_en').eq('program_id',programId).eq('chapter_key',chapterKey).eq('availability','available').maybeSingle(),
  ]);
  if(programError||chapterError)throw new Error('Unable to load assessor chapter');
  if(!program||!chapter?.course_id)notFound();
  const showPreparation=path.length===0;
  const briefingVisible=chapterKey==='chapter-1' && flags.assessor_flow_ui
    ? (await loadAssessorRollout(db,flags,chapter1BriefingIdentity(programId),{actor:{
      id:viewer.appUser.id,role:viewer.appUser.role,active:true,preview:viewer.isPreview,
    }})).uiVisible : false;
  if(briefingVisible) {
    const acknowledgement=await loadBriefingState(db,programId,viewer.appUser.id);
    if(!acknowledgement?.acknowledgedAt)redirect(`/training/${programId}/assessor/chapter-1/briefing`);
  }
  const [{data:course,error:courseError},{data:modules,error:moduleError}]=await Promise.all([
    db.from('courses').select('id').eq('id',chapter.course_id).eq('status','published').maybeSingle(),
    db.from('course_modules').select('id,course_id,position,type,title_fil,title_en,objectives_fil,objectives_en').eq('course_id',chapter.course_id).order('position').limit(32),
  ]);
  if(courseError||moduleError)throw new Error('Unable to load assessor study');
  if(!course)notFound();
  const moduleIds=(modules??[]).map(m=>m.id);
  const {data:lessons,error:lessonError}=moduleIds.length?await db.from('course_lessons')
    .select('id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en,required,published_revision_id,created_at')
    .in('module_id',moduleIds).not('published_revision_id','is',null).order('position').limit(500).returns<CourseLesson[]>():{data:[],error:null};
  if(lessonError)throw new Error('Unable to load study lessons');
  const revisionIds=(lessons??[]).map(l=>l.published_revision_id!);
  const sharedAssessment=chapterKey==='chapter-1' && flags.chapter1_assessment_v2;
  const [{data:completed,error:progressError},{data:resumes,error:resumeError},{data:attempts,error:attemptError},{data:pretestRecord,error:pretestError},{data:sharedState,error:sharedError}]=await Promise.all([
    revisionIds.length?db.from('assessor_lesson_progress').select('lesson_id,revision_id,completed_at')
      .eq('assessor_user_id',viewer.appUser.id).eq('chapter_id',chapter.id).in('revision_id',revisionIds).limit(500).returns<StudyCompletion[]>():Promise.resolve({data:[],error:null}),
    db.from('assessor_lesson_resume').select('lesson_id,revision_id,modality,language,position_key,concept_id,updated_at')
      .eq('assessor_user_id',viewer.appUser.id).eq('chapter_id',chapter.id).order('updated_at',{ascending:false}).limit(1000).returns<StudyResume[]>(),
    db.from('assessor_exam_attempts').select('id,curriculum_version,phase,status,score_percent,passed,pretest_late,started_at,submitted_at')
      .eq('assessor_user_id',viewer.appUser.id).eq('chapter_id',chapter.id).order('started_at',{ascending:false}).limit(50)
      .returns<Array<{id:string;curriculum_version:string;phase:string;status:string;score_percent:number|null;passed:boolean|null;pretest_late:boolean;started_at:string;submitted_at:string|null}>>(),
    curriculum?.requirements.exams.length?db.from('assessor_exam_attempts').select('id').eq('assessor_user_id',viewer.appUser.id)
      .eq('chapter_id',chapter.id).eq('curriculum_version',curriculum.requirements.version).eq('phase','pretest')
      .eq('status','submitted').limit(1).maybeSingle():Promise.resolve({data:null,error:null}),
    sharedAssessment?db.rpc('rpc_learner_assessment_state',{p_course_id:chapter.course_id}):Promise.resolve({data:null,error:null}),
  ]);
  if(progressError||resumeError||attemptError||pretestError||sharedError)throw new Error('Unable to load your candidate progress');
  const study=chapterStudy(chapterKey,modules??[],lessons??[],completed??[],resumes??[]);
  if(!study)notFound();
  let qualification=null;
  let simulation:'remaining'|'recorded'|undefined;
  if(briefingVisible && showPreparation && curriculum) {
    try {
      const [result,saved]=await Promise.all([
        db.rpc('rpc_assessor_qualification_state',{p_chapter_id:chapter.id}),
        db.rpc('rpc_assessor_simulation_state',{p_program_id:programId}),
      ]);
      qualification=result.error?null:preparationQualification(result.data,curriculum.requirements.version);
      const run=saved.error?null:parseSimulationState(saved.data,programId,viewer.appUser.id);
      if(run)simulation=run.receipt?'recorded':'remaining';
    } catch {
      // Unknown status stays unknown; existing study progress is still shown.
    }
  }
  const examAvailable=Boolean(curriculum?.requirements.exams.length);
  const currentAttempts=(attempts??[]).filter(a=>a.curriculum_version===curriculum?.requirements.version && a.status==='submitted');
  const sharedAttempts=(sharedState as {attempts?:Array<{phase:string;state:string;score_percent:number|null}>}|null)?.attempts??[];
  const completedLegacyQualification=sharedAssessment&&sharedAttempts.length===0&&
    currentAttempts.some(a=>a.phase==='posttest'&&a.passed);
  const pretestDone=sharedAssessment
    ? completedLegacyQualification||sharedAttempts.some(a=>a.phase==='pretest'&&a.state==='submitted')
    : Boolean(pretestRecord);
  const posttestPassed=sharedAssessment
    ? completedLegacyQualification||sharedAttempts.some(a=>a.phase==='posttest'&&a.state==='submitted'&&(a.score_percent??0)>=80)
    : currentAttempts.some(a=>a.phase==='posttest'&&a.passed);
  const posttestReady=pretestDone && study.missing===0 && study.completed===study.total;
  const base=`/training/${programId}/assessor/${chapterKey}`;
  const href=(l:CourseLesson)=>`${base}/${l.module_id}/${l.id}`;
  const lesson=!examPage&&path.length===2?study.entries.find(e=>e.lesson?.id===path[1] && e.lesson.module_id===path[0])?.lesson:null;
  const subchapter=!examPage&&path.length?(modules??[]).find(m=>m.id===path[0]):null;
  const majorIntro=sharedAssessment&&pretestDone&&subchapter
    ?chapter1Orientation.introductions.find(item=>item.major_lesson===subchapter.position+1):null;
  const checkpoint=sharedAssessment&&lesson
    ?chapter1Checkpoints.find(group=>group.after_lesson_key===lesson.lesson_key):null;
  if(!examPage&&path.length && (!subchapter || (path.length===2 && !lesson)))notFound();
  if(!examPage&&examAvailable&&!pretestDone&&path.length)redirect(`${base}/exam/pretest`);
  if(examPage&&!examAvailable)notFound();
  const crumbs=[{label:'BHW Reference Manual',href:`/training/${programId}`},{label:title(chapter),...(path.length?{href:base}:{})},...(subchapter?[{label:title(subchapter),...(lesson?{href:`${base}/${subchapter.id}`}:{})}]:[]),...(lesson?[{label:title(lesson)}]:[])];
  let reader:React.ReactNode=null;
  if(lesson && subchapter){
    const {data:revision,error}=await db.from('course_lesson_revisions')
      .select('id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by,created_at')
      .eq('id',lesson.published_revision_id!).eq('lesson_id',lesson.id).single<CourseLessonRevision>();
    if(error||!revision)throw new Error('Unable to load lesson content');
    const available=study.entries.flatMap(e=>e.lesson?[e.lesson]:[]);
    const index=available.findIndex(l=>l.id===lesson.id);
    const next=available[index+1];
    reader=<ManualLesson storyQuestionHandoff={chapterKey==='chapter-1'} data={{title_fil:program.title_fil,title_en:program.title_en,chapters:[],lessons:[{...lesson,revision}],...studyReaderData(chapter.id,(completed??[]).filter(c=>c.lesson_id===lesson.id),(resumes??[]).filter(r=>r.lesson_id===lesson.id))}}
      modules={[subchapter as CourseModule]} lessonId={lesson.id} baseHref={`${base}/${subchapter.id}`} returnHref={`${base}/${subchapter.id}`}
      locale={en?'en':'fil'} readOnly={false} assessorChapterId={chapter.id} lessonNumber={study.entries.findIndex(e=>e.lesson?.id===lesson.id)+1} lessonCount={study.total}
      nextLessonHref={next?href(next):undefined}
      narration={narrationForLesson(narrationManifest as ReferenceNarrationManifest,lesson.lesson_key,en?'en':'fil',revision.read_sections)}/>;
  }
  if(examPage&&sharedAssessment){
    if(!sharedState)throw new Error('Unable to load Chapter 1 assessment');
    return <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6">
      <Chapter1Assessment courseId={chapter.course_id} chapterHref={base}
        locale={locale} sessionId={null} completed={posttestReady} assessor
        initialState={sharedState as {attempts:never[];final_attempts:never[]}}
        orientation={chapter1Orientation} contentApproved={chapter1Orientation.editorial_status==='approved'}/>
      <Link className="text-sm underline" href={base}>{text('Balangkas ng kabanata','Chapter outline')}</Link>
    </main>;
  }
  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
    <Breadcrumbs items={crumbs}/>
    <header><p className="text-sm font-semibold text-primary">{text('Sariling pag-aaral ng assessor','Assessor personal study')}</p>
      <h1 className="mt-2 text-2xl font-semibold">{examPage?(examPhase==='pretest'?text('Diagnostic pretest','Diagnostic pretest'):text('Pangwakas na pagsusulit','Chapter post-test')):lesson?title(lesson):subchapter?title(subchapter):title(chapter)}</h1>
      <p className="mt-2">{briefingVisible?text('Sundan ang sariling paghahanda sa Kabanata 1. Hiwalay ang pag-aaral, pagmamarka at pagsasanay sa platform.','Follow your personal Chapter 1 preparation. Study, scoring and platform practice are separate steps.'):text('Kumpletuhin ang buong kabanata at pumasa sa pagsusulit bago ang oryentasyon sa pagmamarka. Hindi kailangan ng praktikal na pagtatasa ng ibang assessor.','Complete the full chapter and pass its exam before scoring orientation. No practical assessment by another assessor is required.')}</p>
    </header>
    {majorIntro&&<Chapter1MajorIntroduction intro={majorIntro} courseId={chapter.course_id}
      learnerId={viewer.appUser.id} language={en?'en':'fil'}/>}
    <Link prefetch={false} className="self-start rounded border border-primary px-4 py-3 font-medium text-primary" href={`/training/${programId}/assessor/qualifications`}>{text('Aking mga sertipikasyon','My certifications')}</Link>
    {chapterKey==='chapter-1' && <Link prefetch={false} className="self-start rounded border border-primary px-4 py-3 font-medium text-primary" href={`/training/${programId}/assessor/workspace`}>{text('Working area ng Kabanata 1','Chapter 1 working area')}</Link>}
    {briefingVisible && <Link prefetch={false} className="self-start rounded border border-primary px-4 py-3 font-medium text-primary" href={`${base}/briefing`}>{text('Mga layunin at responsibilidad sa Kabanata 1','Chapter 1 objectives and responsibilities')}</Link>}
    {briefingVisible && showPreparation ? <AssessorPreparationChecklist locale={locale} baseHref={base} input={{
      briefingRecorded:true,pretestRecorded:pretestDone,total:study.total,completed:study.completed,missing:study.missing,
      nextLessonHref:study.nextLesson && study.entries.some(e=>e.lesson?.id===study.nextLesson?.id&&!e.done)?href(study.nextLesson):null,
      examAvailable,passingPercent:curriculum?.requirements.exams[0]?.passingPercent??80,attempts:currentAttempts,qualification,simulation,
    }}/> : <section className="rounded-xl border border-ink/15 p-4" aria-label={text('Progreso sa pag-aaral','Study progress')}>
      <p>{text(`${study.completed} sa ${study.total} kinakailangang aralin ang natapos`,`${study.completed} of ${study.total} required lessons completed`)}</p>
      <progress className="mt-2 w-full" max={study.total} value={study.completed} aria-label={text('Mga araling natapos','Lessons completed')}/>
      {study.missing>0 && <p className="mt-2">{text(`${study.missing} kinakailangang aralin ang hindi pa available. Hindi pa kumpleto ang kabanata.`,`${study.missing} required lessons are not yet available. The chapter is incomplete.`)}</p>}
      {study.completed===study.total && <p className="mt-2">{text('Natapos ang mga aralin. Hindi pa ito kwalipikasyon bilang assessor.','Lessons finished. This does not yet qualify you as an assessor.')}</p>}
      {examAvailable&&!pretestDone&&<Link prefetch={false} className="mt-3 inline-block rounded bg-primary px-4 py-3 text-on-primary" href={`${base}/exam/pretest`}>{text('Kunin ang diagnostic pretest','Take the diagnostic pretest')}</Link>}
      {examAvailable&&pretestDone&&!posttestPassed&&posttestReady&&<Link prefetch={false} className="mt-3 inline-block rounded bg-primary px-4 py-3 text-on-primary" href={`${base}/exam/posttest`}>{text('Kunin ang pangwakas na pagsusulit','Take the chapter post-test')}</Link>}
      {examAvailable&&pretestDone&&!posttestReady&&study.nextLesson&&study.nextLesson.id!==lesson?.id&&<Link prefetch={false} className="mt-3 inline-block rounded bg-primary px-4 py-3 text-on-primary" href={href(study.nextLesson)}>{text('Magpatuloy sa pag-aaral','Continue studying')}</Link>}
      {!examAvailable&&<p className="mt-2">{text('Hindi pa available ang kwalipikadong pagsusulit para sa kabanatang ito.','The qualifying exam for this chapter is not yet available.')}</p>}
      {posttestPassed&&posttestReady&&curriculum?.orientationAvailable&&<Link prefetch={false} className="mt-3 inline-block rounded bg-primary px-4 py-3 text-on-primary" href={`${base}/orientation`}>{text('Simulan ang oryentasyon sa pagmamarka','Start scoring orientation')}</Link>}
      {posttestPassed&&!curriculum?.orientationAvailable&&<p className="mt-2">{text('Pumasa ka sa pagsusulit. Susunod ang oryentasyon sa pagmamarka kapag available na ito.','You passed the exam. Scoring orientation is the next step when available.')}</p>}
    </section>}
    {examPage?(examPhase==='posttest'&&!posttestReady
      ?<p>{text('Kumpletuhin muna ang diagnostic pretest at lahat ng aralin bago kumuha ng pangwakas na pagsusulit.','Complete the diagnostic pretest and every lesson before taking the post-test.')}</p>
      :<AssessorExam chapterId={chapter.id} phase={examPhase as 'pretest'|'posttest'} locale={en?'en':'fil'} chapterHref={base}/>)
      :examAvailable&&!pretestDone?<p>{text('Kunin muna ang diagnostic pretest bago simulan ang mga aralin.','Take the diagnostic pretest before starting the lessons.')}</p>
      :reader??(briefingVisible && showPreparation ? <div className="space-y-4">{[...new Set(study.entries.map(e=>e.modulePosition))].map(position=>{
        const entries=study.entries.filter(e=>e.modulePosition===position);
        const heading=`study-subchapter-${position}`;
        return <section key={position} aria-labelledby={heading} className="rounded-xl border border-ink/15 p-4">
          <h2 id={heading} className="font-semibold">{en?entries[0].moduleTitle.en:entries[0].moduleTitle.fil}</h2>
          <p className="mt-1 text-sm">{text(`${entries.filter(e=>e.done).length} sa ${entries.length} aralin ang natapos`,`${entries.filter(e=>e.done).length} of ${entries.length} lessons completed`)}</p>
          <ol className="mt-2 space-y-2">{entries.map(e=><li key={e.key}>
            {e.lesson?<Link prefetch={false} className="inline-flex min-h-11 items-center py-2 underline" href={href(e.lesson)}>{title(e.lesson)}</Link>:<p className="py-2">{text('Kinakailangang aralin — hindi pa available','Required lesson — not yet available')}</p>}
            <p className="text-sm">{e.done?text('Natapos · maaaring balikan','Completed · available for review'):e.lesson?text('Hindi pa natatapos','Not completed'):text('Naghihintay ng paglalathala','Awaiting publication')}</p>
          </li>)}</ol>
        </section>;
      })}</div> : <ol className="grid gap-3">{study.entries.filter(e=>!subchapter||e.modulePosition===subchapter.position).map(e=><li key={e.key} className="rounded-xl border border-ink/15 p-4">
      <p className="text-sm text-ink/70">{en?e.moduleTitle.en:e.moduleTitle.fil}</p>
      {e.lesson?<Link prefetch={false} className="mt-1 block py-2 font-medium underline" href={href(e.lesson)}>{title(e.lesson)}</Link>:<p className="mt-2">{text('Kinakailangang aralin — hindi pa available','Required lesson — not yet available')}</p>}
      <p className="text-sm">{e.done?text('Natapos','Completed'):e.lesson?text('Hindi pa natatapos','Not completed'):text('Naghihintay ng paglalathala','Awaiting publication')}</p>
    </li>)}</ol>)}
    {checkpoint&&lesson&&(completed??[]).some(row=>row.lesson_id===lesson.id&&row.revision_id===lesson.published_revision_id)&&
      <Link prefetch={false} className="block rounded-md border border-ink/20 p-4 underline"
        href={`/courses/${chapter.course_id}/practice/${checkpoint.key}`}>
        {text('Opsyonal na maikling pagsasanay','Optional checkpoint practice')} · {checkpoint.key}
      </Link>}
    {currentAttempts.length>0&&<section aria-label={text('Mga nakaraang pagsusulit','Exam history')} className="rounded-xl border border-ink/15 p-4">
      <h2 className="font-semibold">{text('Mga nakaraang pagsusulit','Exam history')}</h2>
      <ol className="mt-2 space-y-1 text-sm">{currentAttempts.map(a=><li key={a.id}>{a.phase==='pretest'?text('Diagnostic pretest','Diagnostic pretest'):text('Pangwakas na pagsusulit','Post-test')}: {a.score_percent}% {a.phase==='posttest'?(a.passed?text('· Pumasa','· Passed'):text('· Hindi pumasa','· Not passed')):''}</li>)}</ol>
    </section>}
    <Link prefetch={false} className="py-3 underline" href={`/training/${programId}/${chapterKey}`}>{text('Bumalik sa gabay ng facilitator','Back to facilitator guide')}</Link>
  </div>;
}


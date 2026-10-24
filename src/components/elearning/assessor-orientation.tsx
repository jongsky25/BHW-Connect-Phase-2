'use client';

import Link from 'next/link';
import {useState, type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import {AssessorEvidenceWalkthrough} from './assessor-evidence-walkthrough';

type Localized = {fil:string;en:string};
type Rating = 'kaya_na'|'kailangan_practice'|'hindi_pa';
type Case = {id:string;indicator:string;case:Localized;critical?:boolean};
type Lesson = {id:string;title:Localized;body:Localized[]};
export type OrientationState = {
  ready:boolean;passed:boolean;title?:Localized;guide?:Localized[];lessons?:Lesson[];completed_lessons?:string[];cases?:Case[];
  passing_count?:number;attempts?:number;orientation_version?:string;
};
export type OrientationCriterion = {title:Localized;observable:Localized;anchors:Record<Rating,Localized>};
type Result = {correct_count:number;question_count:number;passed:boolean;critical_correct:boolean;feedback:{id:string;correct:Rating;reason:Localized}[]};
const ratings: {key:Rating;label:Localized}[] = [
  {key:'kaya_na',label:{fil:'Kaya na',en:'Kaya na (can do)'}},
  {key:'kailangan_practice',label:{fil:'Kailangan pa ng practice',en:'Kailangan pa ng practice (needs practice)'}},
  {key:'hindi_pa',label:{fil:'Hindi pa',en:'Hindi pa (not yet)'}},
];
const ratingStyle: Record<Rating,string> = {
  kaya_na:'border-success/50 bg-success/10',
  kailangan_practice:'border-warning/60 bg-warning/15',
  hindi_pa:'border-danger/50 bg-danger/10',
};

export function AssessorOrientation({chapterId,chapterHref,chapterLabel={fil:'Kabanata I',en:'Chapter I'},locale,initial,chapter1Context}:{chapter1Context?:Record<string,OrientationCriterion>|null;chapterId:string;chapterHref:string;chapterLabel?:Localized;locale:string;initial:OrientationState}) {
  const en=locale==='en';
  const text=(fil:string,english:string)=>en?english:fil;
  const local=(value:Localized)=>value[en?'en':'fil'];
  const [answers,setAnswers]=useState<Record<string,Rating>>({});
  const [completed,setCompleted]=useState<string[]>(initial.completed_lessons??[]);
  const [selected,setSelected]=useState(()=>Math.max(0,(initial.lessons??[]).findIndex(lesson=>!initial.completed_lessons?.includes(lesson.id))));
  const [recoveredPass,setRecoveredPass]=useState(false);
  const [acknowledged,setAcknowledged]=useState(false);
  const [result,setResult]=useState<Result|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const cases=initial.cases??[];
  const criticalCount=cases.filter(item=>item.critical).length;
  const lessons=initial.lessons??[];
  const allLessonsDone=lessons.length>0 && lessons.every(lesson=>completed.includes(lesson.id));
  const activeLesson=lessons[selected];
  const passed=initial.passed || recoveredPass || result?.passed;
  const revised=chapter1Context!==undefined;
  const contextAvailable=!revised || (chapter1Context!==null && cases.every(item=>chapter1Context[item.id]));

  async function checkSavedProgress() {
    setBusy(true);setError(null);
    try {
      const {data,error:rpcError}=await createClient().rpc('rpc_assessor_orientation_state',{p_chapter_id:chapterId});
      if(rpcError)throw rpcError;
      const state=data as OrientationState;
      if(state?.ready!==true || typeof state.passed!=='boolean' || state.orientation_version!==initial.orientation_version
        || !Array.isArray(state.completed_lessons) || !state.completed_lessons.every(id=>typeof id==='string'))throw new Error('State unavailable');
      setCompleted(state.completed_lessons);
      if(state.passed)setRecoveredPass(true);
      setSelected(Math.max(0,lessons.findIndex(lesson=>!state.completed_lessons!.includes(lesson.id))));
    } catch {
      setError(text('Hindi makumpirma ang na-save na progreso. Mananatili rito ang mga sagot mo; subukang suriin muli o bumalik sa kabanata.', 'Saved progress could not be confirmed. Your answers remain here; check again or return to the chapter.'));
    } finally {setBusy(false);}
  }

  async function completeLesson() {
    if(!activeLesson)return;
    setBusy(true);setError(null);
    try {
      const {error:rpcError}=await createClient().rpc('rpc_assessor_orientation_lesson_complete',{
        p_chapter_id:chapterId,p_lesson_id:activeLesson.id,
      });
      if(rpcError)throw rpcError;
      const nextCompleted=completed.includes(activeLesson.id)?completed:[...completed,activeLesson.id];
      setCompleted(nextCompleted);
      const next=lessons.findIndex(lesson=>!nextCompleted.includes(lesson.id));
      if(next>=0)setSelected(next);
    } catch {
      setError(text('Hindi makumpirma ang pag-save ng aralin. Subukang i-save muli o suriin ang na-save na progreso.', 'Lesson save could not be confirmed. Try saving again or check saved progress.'));
    } finally {setBusy(false);}
  }

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy || passed || !allLessonsDone || !contextAvailable)return;
    if(!acknowledged || cases.some(c=>!answers[c.id])){
      setError(text('Basahin ang gabay at markahan ang bawat kaso.','Read the guide and score every case.'));return;
    }
    setBusy(true);setError(null);
    try {
      const {data,error:rpcError}=await createClient().rpc('rpc_assessor_orientation_submit',{
        p_chapter_id:chapterId,p_answers:cases.map(c=>({id:c.id,rating:answers[c.id]})),p_acknowledged:true,
      });
      if(rpcError)throw rpcError;
      const submitted=data as Result;
      if(typeof submitted?.correct_count!=='number' || typeof submitted.question_count!=='number'
        || typeof submitted.passed!=='boolean' || typeof submitted.critical_correct!=='boolean'
        || !Array.isArray(submitted.feedback) || !submitted.feedback.every(f=>cases.some(c=>c.id===f.id)
          && ratings.some(r=>r.key===f.correct) && typeof f.reason?.en==='string' && typeof f.reason?.fil==='string'))throw new Error('Orientation result unavailable');
      setResult(submitted);
    } catch {
      setError(text('Hindi makumpirma ang resulta. Nananatili rito ang mga sagot mo. Suriin muna ang na-save na progreso bago muling magsumite; maaaring naitala na ang attempt.', 'The result could not be confirmed. Your answers remain here. Check saved progress before submitting again; the attempt may already be recorded.'));
    } finally {setBusy(false);}
  }

  if(!initial.ready&&!passed) return <section className="rounded-xl border border-ink/20 p-5">
    <p>{text('Kumpletuhin muna ang diagnostic pretest, lahat ng kasalukuyang aralin, at pangwakas na pagsusulit ng kabanata.','Complete the diagnostic pretest, all current lessons, and the chapter post-test first.')}</p>
    <Link prefetch={false} href={chapterHref} className="mt-3 inline-block underline">{text('Bumalik sa kabanata','Back to chapter')}</Link>
  </section>;

  return <div className="flex flex-col gap-6">
    <header>
      <p className="text-sm font-semibold text-primary">{local(chapterLabel)} · {text('Oryentasyon ng assessor','Assessor orientation')}</p>
      <h1 className="mt-2 text-2xl font-semibold">{initial.title?local(initial.title):text('Oryentasyon sa pagmamarka','Scoring orientation')}</h1>
      <p className="mt-2 text-ink/70">{text(`Tapusin ang ${lessons.length} aralin, pagkatapos ay markahan ang ${cases.length} halimbawa. Kailangan ang ${initial.passing_count} tamang sagot at tamang marka sa ${criticalCount} kasong pangkaligtasan. Maaaring ulitin ang pagsasanay.`,`Complete ${lessons.length} lessons, then rate ${cases.length} examples. You need ${initial.passing_count} correct answers and correct ratings on all ${criticalCount} safety cases. You may repeat the practice.`)}</p>
    </header>
    <section className="rounded-xl border border-ink/20 p-5" aria-label={text('Gabay sa pagmamarka','Scoring guide')}>
      <h2 className="text-lg font-semibold">{text('Gabay sa pagmamarka','Scoring guide')}</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5">{initial.guide?.map((item,i)=><li key={i}>{local(item)}</li>)}</ol>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">{ratings.map(r=><p key={r.key} className={`rounded border p-3 font-medium ${ratingStyle[r.key]}`}>{local(r.label)}</p>)}</div>
      <p className="mt-3 text-sm text-ink/70">{text('Gabay lamang ang kulay. Ibatay ang marka sa naobserbahang ebidensya at sa criterion ng gawain.','Color is a visual guide. Base the rating on observed evidence and the task criterion.')}</p>
    </section>
    {activeLesson&&<section className="rounded-xl border border-ink/20 p-5" aria-label={text('Mga aralin sa oryentasyon','Orientation lessons')}>
      <h2 className="text-lg font-semibold">{text(`Mga aralin · ${lessons.filter(lesson=>completed.includes(lesson.id)).length} sa ${lessons.length}`,`Lessons · ${lessons.filter(lesson=>completed.includes(lesson.id)).length} of ${lessons.length}`)}</h2>
      <nav className="mt-3 flex flex-wrap gap-2" aria-label={text('Pumili ng aralin','Choose a lesson')}>
        {lessons.map((lesson,index)=><button key={lesson.id} type="button" onClick={()=>setSelected(index)} aria-label={`${index+1}. ${local(lesson.title)} · ${completed.includes(lesson.id)?text('Natapos','Completed'):text('Hindi pa natatapos','Not completed')}`} aria-current={selected===index?'step':undefined}
          className="min-h-11 min-w-11 rounded border border-ink/20 px-3 py-2 text-sm" disabled={busy}>
          {completed.includes(lesson.id)?'✓ ':'○ '}{index+1}
        </button>)}
      </nav>
      <article className="mt-5" aria-labelledby="orientation-lesson-title">
        <h3 id="orientation-lesson-title" className="font-semibold">{local(activeLesson.title)}</h3>
        <div className="mt-3 space-y-3">{activeLesson.body.map((paragraph,index)=><p key={index}>{local(paragraph)}</p>)}</div>
      </article>
      {!completed.includes(activeLesson.id)&&<button type="button" onClick={completeLesson} disabled={busy}
        className="mt-4 rounded bg-primary px-4 py-3 font-medium text-on-primary disabled:opacity-60">
        {busy?text('Itinatala…','Saving…'):text('Tapos na ang araling ito','Mark lesson complete')}
      </button>}
    </section>}
    {!allLessonsDone&&!passed&&<p className="rounded-xl border border-ink/20 p-4 text-sm" role="status">
      {text('Kumpletuhin ang lahat ng aralin para mabuksan ang pagsasanay sa pagmamarka.','Complete every lesson to unlock the scoring practice.')}
    </p>}
    {revised&&<AssessorEvidenceWalkthrough locale={locale}/>}
    {revised&&<p className="rounded-xl border border-ink/20 p-4 text-sm">{text('Pagmamarka lamang ang pagsasanay na ito. Hiwalay ang coached platform competency simulation; tingnan ang availability nito sa iyong paghahanda. Hindi ito nakukumpleto ng scoring pass; hindi pa available ang binagong sertipikasyon.', 'This exercise calibrates scoring only. The coached platform competency simulation is separate; check its availability in your preparation. A scoring pass does not complete it; revised certification remains unavailable.')}</p>}
    {!contextAvailable&&<p role="status">{text('Hindi available ang tugmang gabay sa criterion. Bumalik sa kabanata at buksan muli ang oryentasyon. Mananatili ang anumang naitalang pagpasa.', 'Matching criterion guidance is unavailable. Return to the chapter and reopen orientation. Any recorded pass is retained.')}</p>}
    {passed ? <section role="status" className="rounded-xl border border-primary/40 bg-primary/5 p-5">
      <h2 className="font-semibold">{text('Natapos ang oryentasyon','Orientation completed')}</h2>
      <p>{text(`Naitala ang iyong pagpasa para sa ${chapterLabel.fil}. Tingnan ang naibigay na kwalipikasyon at katayuan nito.`,`Your ${chapterLabel.en} pass is recorded. Check your issued qualification and its status.`)}</p>
      <Link prefetch={false} href={`${chapterHref.split('/assessor/')[0]}/assessor/qualifications`} className="mt-3 inline-block underline">{text('Tingnan ang aking mga kwalipikasyon','View my qualifications')}</Link>
    </section> : allLessonsDone&&contextAvailable&&<form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <h2 className="text-lg font-semibold">{text('Pagsasanay sa pagmamarka','Scoring practice')}</h2>
      {cases.map((item,index)=><fieldset key={item.id} className="rounded-xl border border-ink/20 p-4">
        <legend className="px-1 font-semibold">{text(`Kaso ${index+1}`,`Case ${index+1}`)}{item.critical?` · ${text('Kaligtasan','Safety')}`:''}</legend>
        <p>{local(item.case)}</p>
        {chapter1Context?.[item.id] ? <div className="mt-3 rounded border border-ink/15 p-3">
          <p className="text-sm text-ink/70">{local(chapter1Context[item.id].title)}</p>
          <h3 className="mt-2 font-semibold">{local(chapter1Context[item.id].observable)}</h3>
          <dl className="mt-3 space-y-3">{ratings.map(r=><div key={r.key}>
            <dt className={`rounded border px-2 py-1 font-medium ${ratingStyle[r.key]}`}>{local(r.label)}</dt><dd>{local(chapter1Context[item.id].anchors[r.key])}</dd>
          </div>)}</dl>
        </div> : <p className="mt-1 text-xs text-ink/60">{item.indicator}</p>}
        <div className="mt-3 flex flex-col gap-2">{ratings.map(r=><label key={r.key} className={`flex min-h-11 items-center gap-2 rounded border px-3 py-2 ${ratingStyle[r.key]} ${answers[item.id]===r.key?'ring-2 ring-primary ring-offset-1':''}`}>
          <input type="radio" name={`case-${item.id}`} value={r.key} checked={answers[item.id]===r.key} disabled={busy}
            onChange={()=>setAnswers(prev=>({...prev,[item.id]:r.key}))}/>{local(r.label)}
        </label>)}</div>
      </fieldset>)}
      <label className="flex items-start gap-2"><input type="checkbox" checked={acknowledged} disabled={busy} onChange={e=>setAcknowledged(e.target.checked)} className="mt-1"/>
        {text('Nabasa ko ang gabay at ibinatay ko ang mga marka sa naobserbahang ebidensya.','I read the guide and based my ratings on the observed evidence.')}</label>
      <button type="submit" disabled={busy} className="self-start rounded bg-primary px-4 py-3 font-medium text-on-primary disabled:opacity-60">
        {busy?text('Isinusumite…','Submitting…'):text('Isumite ang mga marka','Submit ratings')}
      </button>
      {result&&!result.passed&&<p>{text('Balikan ang feedback sa ibaba, baguhin ang mga marka, at isumite muli. Nananatili sa history ang naunang attempt.', 'Review the feedback below, change your ratings and submit again. The earlier attempt stays in your history.')}</p>}
    </form>}
    {result && !recoveredPass && <section role="status" className="rounded-xl border border-info/40 bg-info/5 p-5">
      <h2 className="font-semibold">{text(`Tamang marka: ${result.correct_count} sa ${result.question_count}`,`Correct ratings: ${result.correct_count} of ${result.question_count}`)}</h2>
      <p>{result.passed?text('Pumasa ka sa pagsasanay.','You passed the practice.'):text('Balikan ang gabay at subukang muli.','Review the guide and try again.')}</p>
      {!result.critical_correct&&<p className="font-medium">{text('Balikan ang mga desisyon sa kasong pangkaligtasan.','Review the safety case decisions.')}</p>}
      <ol className="mt-3 space-y-3">{result.feedback.map((f,index)=><li key={f.id}>
        <span className="font-medium">{text(`Kaso ${index+1}`,`Case ${index+1}`)}: {local(ratings.find(r=>r.key===f.correct)!.label)}</span>
        <p>{local(f.reason)}</p>
      </li>)}</ol>
    </section>}
    {error&&<div className="space-y-2">
      <p role="alert" className="text-sm text-danger">{error}</p>
      <button type="button" onClick={checkSavedProgress} disabled={busy} className="min-h-11 rounded border border-ink/20 px-3 py-2">{busy?text('Sinusuri…','Checking…'):text('Suriin ang na-save na progreso','Check saved progress')}</button>
    </div>}
    <Link prefetch={false} href={chapterHref} className="self-start py-2 underline">{text('Bumalik sa kabanata','Back to chapter')}</Link>
  </div>;
}

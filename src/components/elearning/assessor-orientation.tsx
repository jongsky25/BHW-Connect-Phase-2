'use client';

import Link from 'next/link';
import {useState, type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';

type Localized = {fil:string;en:string};
type Rating = 'kaya_na'|'kailangan_practice'|'hindi_pa';
type Case = {id:string;indicator:string;case:Localized;critical?:boolean};
type Lesson = {id:string;title:Localized;body:Localized[]};
export type OrientationState = {
  ready:boolean;passed:boolean;title?:Localized;guide?:Localized[];lessons?:Lesson[];completed_lessons?:string[];cases?:Case[];
  passing_count?:number;attempts?:number;
};
type Result = {correct_count:number;question_count:number;passed:boolean;critical_correct:boolean;feedback:{id:string;correct:Rating;reason:Localized}[]};
const ratings: {key:Rating;label:Localized}[] = [
  {key:'kaya_na',label:{fil:'Kaya na',en:'Kaya na (can do)'}},
  {key:'kailangan_practice',label:{fil:'Kailangan pa ng practice',en:'Kailangan pa ng practice (needs practice)'}},
  {key:'hindi_pa',label:{fil:'Hindi pa',en:'Hindi pa (not yet)'}},
];

export function AssessorOrientation({chapterId,chapterHref,locale,initial}:{chapterId:string;chapterHref:string;locale:string;initial:OrientationState}) {
  const en=locale==='en';
  const text=(fil:string,english:string)=>en?english:fil;
  const local=(value:Localized)=>value[en?'en':'fil'];
  const [answers,setAnswers]=useState<Record<string,Rating>>({});
  const [completed,setCompleted]=useState<string[]>(initial.completed_lessons??[]);
  const [selected,setSelected]=useState(0);
  const [acknowledged,setAcknowledged]=useState(false);
  const [result,setResult]=useState<Result|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const cases=initial.cases??[];
  const lessons=initial.lessons??[];
  const allLessonsDone=lessons.length>0 && lessons.every(lesson=>completed.includes(lesson.id));
  const activeLesson=lessons[selected];

  async function completeLesson() {
    if(!activeLesson)return;
    setBusy(true);setError(null);
    try {
      const {error:rpcError}=await createClient().rpc('rpc_assessor_orientation_lesson_complete',{
        p_chapter_id:chapterId,p_lesson_id:activeLesson.id,
      });
      if(rpcError)throw rpcError;
      setCompleted(prev=>prev.includes(activeLesson.id)?prev:[...prev,activeLesson.id]);
      if(selected<lessons.length-1)setSelected(selected+1);
    } catch(cause) {
      setError(cause instanceof Error?cause.message:text('Hindi naitala ang aralin.','Could not record the lesson.'));
    } finally {setBusy(false);}
  }

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      if(typeof submitted?.correct_count!=='number' || !Array.isArray(submitted.feedback))throw new Error('Orientation result unavailable');
      setResult(submitted);
    } catch(cause) {
      setError(cause instanceof Error?cause.message:text('Hindi naisumite ang mga marka.','Could not submit the ratings.'));
    } finally {setBusy(false);}
  }

  if(!initial.ready) return <section className="rounded-xl border border-ink/20 p-5">
    <p>{text('Kumpletuhin muna ang diagnostic pretest, lahat ng kasalukuyang aralin, at pangwakas na pagsusulit ng kabanata.','Complete the diagnostic pretest, all current lessons, and the chapter post-test first.')}</p>
    <Link prefetch={false} href={chapterHref} className="mt-3 inline-block underline">{text('Bumalik sa kabanata','Back to chapter')}</Link>
  </section>;

  return <div className="flex flex-col gap-6">
    <header>
      <p className="text-sm font-semibold text-primary">{text('Kabanata I · Oryentasyon ng assessor','Chapter I · Assessor orientation')}</p>
      <h1 className="mt-2 text-2xl font-semibold">{initial.title?local(initial.title):text('Oryentasyon sa pagmamarka','Scoring orientation')}</h1>
      <p className="mt-2 text-ink/70">{text(`Tapusin ang ${lessons.length} aralin, pagkatapos ay markahan ang ${cases.length} halimbawa. Kailangan ang ${initial.passing_count} tamang sagot at tamang marka sa kasong pangkaligtasan. Maaaring ulitin ang pagsasanay.`,`Complete ${lessons.length} lessons, then rate ${cases.length} examples. You need ${initial.passing_count} correct answers and the correct rating on the safety case. You may repeat the practice.`)}</p>
    </header>
    <section className="rounded-xl border border-ink/20 p-5" aria-label={text('Gabay sa pagmamarka','Scoring guide')}>
      <h2 className="text-lg font-semibold">{text('Gabay sa pagmamarka','Scoring guide')}</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5">{initial.guide?.map((item,i)=><li key={i}>{local(item)}</li>)}</ol>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">{ratings.map(r=><p key={r.key} className="rounded border border-ink/15 p-3 font-medium">{local(r.label)}</p>)}</div>
    </section>
    {activeLesson&&<section className="rounded-xl border border-ink/20 p-5" aria-label={text('Mga aralin sa oryentasyon','Orientation lessons')}>
      <h2 className="text-lg font-semibold">{text(`Mga aralin · ${completed.length} sa ${lessons.length}`,`Lessons · ${completed.length} of ${lessons.length}`)}</h2>
      <nav className="mt-3 flex flex-wrap gap-2" aria-label={text('Pumili ng aralin','Choose a lesson')}>
        {lessons.map((lesson,index)=><button key={lesson.id} type="button" onClick={()=>setSelected(index)} aria-current={selected===index?'step':undefined}
          className="rounded border border-ink/20 px-3 py-2 text-sm" disabled={busy}>
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
    {!allLessonsDone&&!initial.passed&&<p className="rounded-xl border border-ink/20 p-4 text-sm" role="status">
      {text('Kumpletuhin ang lahat ng aralin para mabuksan ang pagsasanay sa pagmamarka.','Complete every lesson to unlock the scoring practice.')}
    </p>}
    {initial.passed || result?.passed ? <section role="status" className="rounded-xl border border-primary/40 bg-primary/5 p-5">
      <h2 className="font-semibold">{text('Natapos ang oryentasyon','Orientation completed')}</h2>
      <p>{text('Naitala ang iyong pagpasa para sa Kabanata I. Tingnan ang naibigay na kwalipikasyon at katayuan nito.','Your Chapter I pass is recorded. Check your issued qualification and its status.')}</p>
      <Link prefetch={false} href={`${chapterHref.split('/assessor/')[0]}/assessor/qualifications`} className="mt-3 inline-block underline">{text('Tingnan ang aking mga kwalipikasyon','View my qualifications')}</Link>
    </section> : allLessonsDone&&<form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <h2 className="text-lg font-semibold">{text('Pagsasanay sa pagmamarka','Scoring practice')}</h2>
      {cases.map((item,index)=><fieldset key={item.id} className="rounded-xl border border-ink/20 p-4">
        <legend className="px-1 font-semibold">{text(`Kaso ${index+1}`,`Case ${index+1}`)}{item.critical?` · ${text('Kaligtasan','Safety')}`:''}</legend>
        <p>{local(item.case)}</p>
        <p className="mt-1 text-xs text-ink/60">{item.indicator}</p>
        <div className="mt-3 flex flex-col gap-2">{ratings.map(r=><label key={r.key} className="flex min-h-11 items-center gap-2 rounded border border-ink/15 px-3 py-2">
          <input type="radio" name={`case-${item.id}`} value={r.key} checked={answers[item.id]===r.key} disabled={busy}
            onChange={()=>setAnswers(prev=>({...prev,[item.id]:r.key}))}/>{local(r.label)}
        </label>)}</div>
      </fieldset>)}
      <label className="flex items-start gap-2"><input type="checkbox" checked={acknowledged} disabled={busy} onChange={e=>setAcknowledged(e.target.checked)} className="mt-1"/>
        {text('Nabasa ko ang gabay at ibinatay ko ang mga marka sa naobserbahang ebidensya.','I read the guide and based my ratings on the observed evidence.')}</label>
      <button type="submit" disabled={busy} className="self-start rounded bg-primary px-4 py-3 font-medium text-on-primary disabled:opacity-60">
        {busy?text('Isinusumite…','Submitting…'):text('Isumite ang mga marka','Submit ratings')}
      </button>
    </form>}
    {result && <section role="status" className="rounded-xl border border-info/40 bg-info/5 p-5">
      <h2 className="font-semibold">{text(`Tamang marka: ${result.correct_count} sa ${result.question_count}`,`Correct ratings: ${result.correct_count} of ${result.question_count}`)}</h2>
      <p>{result.passed?text('Pumasa ka sa pagsasanay.','You passed the practice.'):text('Balikan ang gabay at subukang muli.','Review the guide and try again.')}</p>
      {!result.critical_correct&&<p className="font-medium">{text('Balikan ang desisyon sa kasong pangkaligtasan.','Review the safety case decision.')}</p>}
      <ol className="mt-3 space-y-3">{result.feedback.map((f,index)=><li key={f.id}>
        <span className="font-medium">{text(`Kaso ${index+1}`,`Case ${index+1}`)}: {local(ratings.find(r=>r.key===f.correct)!.label)}</span>
        <p>{local(f.reason)}</p>
      </li>)}</ol>
    </section>}
    {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
    <Link prefetch={false} href={chapterHref} className="self-start py-2 underline">{text('Bumalik sa kabanata','Back to chapter')}</Link>
  </div>;
}

'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState, type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import {TestQuestionFields, type RenderedTestQuestion} from './pre-post-test';

type Phase = 'pretest' | 'posttest';
type OpenAttempt = {attempt_id:string;phase:Phase;questions:RenderedTestQuestion[];passing_percent:number|null;pretest_late:boolean};
type Result = {score_percent:number;passed:boolean;phase:Phase;pretest_late:boolean};

export function AssessorExam({chapterId,phase,locale,chapterHref}:{chapterId:string;phase:Phase;locale:string;chapterHref:string}) {
  const en=locale==='en';
  const router=useRouter();
  const [attempt,setAttempt]=useState<OpenAttempt|null>(null);
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const [result,setResult]=useState<Result|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const text=(fil:string,english:string)=>en?english:fil;

  async function open() {
    setBusy(true);setError(null);
    try {
      const {data,error:rpcError}=await createClient().rpc('rpc_assessor_exam_open',{p_chapter_id:chapterId,p_phase:phase});
      if(rpcError)throw rpcError;
      const opened=data as OpenAttempt;
      if(!opened?.attempt_id || !opened.questions?.length)throw new Error('Exam unavailable');
      setAttempt(opened);setAnswers({});setResult(null);
    } catch (cause) {
      setError(cause instanceof Error?cause.message:text('Hindi mabuksan ang pagsusulit.','Could not open the exam.'));
    } finally {setBusy(false);}
  }

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!attempt)return;
    if(attempt.questions.some(q=>answers[q.id]===undefined)){
      setError(text('Sagutin ang bawat tanong.','Answer every question.'));return;
    }
    setBusy(true);setError(null);
    try {
      const payload=attempt.questions.map(q=>({question_id:q.id,selected_option_index:answers[q.id]}));
      const {data,error:rpcError}=await createClient().rpc('rpc_assessor_exam_submit',{p_attempt_id:attempt.attempt_id,p_answers:payload});
      if(rpcError)throw rpcError;
      const submitted=data as Result;
      if(typeof submitted?.score_percent!=='number')throw new Error('Exam result unavailable');
      setResult(submitted);setAttempt(null);setAnswers({});router.refresh();
    } catch (cause) {
      setError(cause instanceof Error?cause.message:text('Hindi naisumite ang pagsusulit.','Could not submit the exam.'));
    } finally {setBusy(false);}
  }

  return <section className="flex flex-col gap-4 rounded-xl border border-ink/20 p-4">
    <div>
      <h2 className="text-lg font-semibold">{phase==='pretest'?text('Diagnostic pretest','Diagnostic pretest'):text('Pangwakas na pagsusulit ng kabanata','Chapter post-test')}</h2>
      <p className="mt-1 text-sm text-ink/70">{phase==='pretest'
        ?text('Walang pasadong marka. Kumuha nito bago simulan ang mga aralin.','There is no passing score. Take this before starting the lessons.')
        :text('Kailangan ang 80% upang magpatuloy sa oryentasyon. Maaaring umulit kapag hindi pumasa.','Score at least 80% to proceed to orientation. You can retry after an unsuccessful attempt.')}</p>
    </div>
    {result && <div role="status" className="rounded-lg border border-info/40 bg-info/5 p-3">
      <p>{text(`Marka: ${result.score_percent}%`,`Score: ${result.score_percent}%`)}</p>
      <p>{phase==='pretest'?text('Naitala ang diagnostic baseline.','Diagnostic baseline recorded.')
        :result.passed?text('Pumasa. Ang oryentasyon ang susunod na hakbang.','Passed. Orientation is the next step.')
          :text('Hindi pa pumasa. Naitala ang pagsubok; maaari kang umulit.','Not yet passed. This attempt is saved; you can retry.')}</p>
      {result.pretest_late && <p className="text-sm">{text('Naitala ito matapos magsimula ang pag-aaral.','This diagnostic was recorded after study had begun.')}</p>}
    </div>}
    {!attempt && <div className="flex flex-wrap items-center gap-3">
      {(phase==='pretest'?!result:!result?.passed) && <button type="button" disabled={busy} onClick={open}
        className="rounded bg-primary px-4 py-3 font-medium text-on-primary disabled:opacity-60">
        {busy?text('Binubuksan…','Opening…'):phase==='posttest'&&result?text('Ulitin ang pagsusulit','Retry exam'):text('Simulan ang pagsusulit','Start exam')}
      </button>}
      <Link prefetch={false} href={chapterHref} className="py-3 underline">{text('Bumalik sa kabanata','Back to chapter')}</Link>
    </div>}
    {attempt && <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-ink/70">{attempt.questions.length} {text('tanong','questions')}
        {attempt.passing_percent!==null?` · ${attempt.passing_percent}% ${text('upang pumasa','to pass')}`:''}</p>
      <TestQuestionFields questions={attempt.questions} locale={locale} answers={answers}
        onAnswer={(id,option)=>setAnswers(prev=>({...prev,[id]:option}))} disabled={busy} namePrefix={`assessor-${phase}`} />
      <button type="submit" disabled={busy} className="self-start rounded bg-primary px-4 py-3 font-medium text-on-primary disabled:opacity-60">
        {busy?text('Isinusumite…','Submitting…'):text('Isumite ang mga sagot','Submit answers')}
      </button>
    </form>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </section>;
}

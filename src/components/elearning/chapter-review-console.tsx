'use client';

import {useRouter} from 'next/navigation';
import {useRef,useState} from 'react';
import {type ChapterReviewComponent,type ChapterReviewState} from '@/lib/assessor/chapter-review';
import {createClient} from '@/lib/supabase/client';
import {chapter1Terms} from '@/lib/assessor/chapter1-workflow-parity';

const field='min-h-11 w-full rounded border border-ink/30 bg-canvas px-3 py-2';
const outcomeText=(value:string,en:boolean)=>({
  complete:en?'Complete':'Kumpleto',
  needs_practice:en?'Needs further practice':'Kailangan ng dagdag na pagsasanay',
  insufficient_evidence:en?'Evidence pending':'Naghihintay ng sapat na ebidensya',
})[value as 'complete'|'needs_practice'|'insufficient_evidence']??value;
const evidenceText=(value:string,en:boolean)=>({
  sufficient:en?'Sufficient evidence':'Sapat ang ebidensya',
  insufficient:en?'Insufficient evidence':'Kulang ang ebidensya',
  not_observed:en?'Not observed':'Hindi naobserbahan',
  kaya_na:en?'Can do':'Kaya na',
  kailangan_practice:en?'Needs practice':'Kailangan ng pagsasanay',
  hindi_pa:en?'Not yet':'Hindi pa',
})[value as 'sufficient'|'insufficient'|'not_observed'|'kaya_na'|'kailangan_practice'|'hindi_pa']??value;

function ComponentActions({item,en}:{item:ChapterReviewComponent;en:boolean}){
  const router=useRouter();const key=useRef<string|null>(null);
  const [fil,setFil]=useState('');const [english,setEnglish]=useState('');
  const [practice,setPractice]=useState('');const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const releaseable=item.ownedByMe&&item.attemptStatus==='submitted'&&!item.feedbackReleased;
  const retryable=item.ownedByMe&&item.feedbackReleased&&!item.retryOpened
    &&item.outcome!==null&&item.outcome!=='complete';
  async function release(){
    if(!item.attemptId||busy)return;key.current??=crypto.randomUUID();setBusy(true);setMessage('');
    try{
      const {error}=await createClient().rpc('rpc_assessor_formal_feedback_release',{
        p_key:key.current,p_attempt_id:item.attemptId,p_fil:fil,p_en:english});
      if(error)throw error;
      setMessage(en?'Feedback released.':'Nailabas ang feedback.');router.refresh();
    }catch{setMessage(en?'Feedback could not be released. Recheck authority and try again.':
      'Hindi nailabas ang feedback. Suriin ang pahintulot at subukang muli.');}
    finally{setBusy(false);}
  }
  async function retry(){
    if(!item.attemptId||busy)return;key.current??=crypto.randomUUID();setBusy(true);setMessage('');
    try{
      const {error}=await createClient().rpc('rpc_assessor_formal_retry_request',{
        p_key:key.current,p_prior_attempt_id:item.attemptId,
        p_practice_note:practice,p_practice_attempt_id:null});
      if(error)throw error;
      setMessage(en?'New request added to the assessment queue.':'Nagdagdag ng bagong kahilingan sa pila.');router.refresh();
    }catch{setMessage(en?'Reassessment could not be opened. Recheck the practice record, contract and readiness.':
      'Hindi mabuksan ang muling pagtatasa. Suriin ang tala ng pagsasanay, kontrata, at kahandaan.');}
    finally{setBusy(false);}
  }
  return <div className="mt-4 space-y-3">
    {releaseable&&<div className="rounded border border-primary/30 p-3">
      <h4 className="font-medium">{en?'Release component feedback':'Ilabas ang feedback sa bahagi'}</h4>
      <label className="mt-2 block text-sm">Buod sa Filipino
        <textarea className={field} rows={2} maxLength={2000} value={fil}
          onChange={event=>{setFil(event.target.value);key.current=null;}}/></label>
      <label className="mt-2 block text-sm">Summary in English
        <textarea className={field} rows={2} maxLength={2000} value={english}
          onChange={event=>{setEnglish(event.target.value);key.current=null;}}/></label>
      <button disabled={busy||fil.trim().length<10||english.trim().length<10} onClick={release}
        className="mt-3 min-h-11 rounded bg-primary px-4 text-on-primary disabled:opacity-50">
        {en?'Release feedback':'Ilabas ang feedback'}</button>
    </div>}
    {retryable&&<div className="rounded border border-primary/30 p-3">
      <h4 className="font-medium">{en?'Open reassessment after further practice':'Muling pagtatasa pagkatapos ng dagdag na pagsasanay'}</h4>
      <p className="mt-1 text-sm">{en?'Describe the further practice or observation. The new formal checklist starts empty; prior ratings are reference only.':
        'Ilarawan ang dagdag na pagsasanay o obserbasyon. Walang awtomatikong ililipat na rating sa bagong pormal na tala.'}</p>
      <label className="mt-2 block text-sm">{en?'Further practice record':'Tala ng dagdag na pagsasanay'}
        <textarea className={field} rows={3} maxLength={2000} value={practice}
          onChange={event=>{setPractice(event.target.value);key.current=null;}}/></label>
      <button disabled={busy||practice.trim().length<20} onClick={retry}
        className="mt-3 min-h-11 rounded bg-primary px-4 text-on-primary disabled:opacity-50">
        {en?'Open new request':'Magbukas ng bagong kahilingan'}</button>
    </div>}
    {item.retryOpened&&<p className="text-sm">{en?'A reassessment request is already open. Find it in the assessment queue.':
      'May bukas nang kahilingan para sa muling pagtatasa. Tingnan ito sa pila.'}</p>}
    {message&&<p role="status" className="text-sm">{message}</p>}
  </div>;
}

export function ChapterReviewConsole({state,lang}:{state:ChapterReviewState;lang:'fil'|'en'}){
  const en=lang==='en';const router=useRouter();const key=useRef<string|null>(null);
  const [fil,setFil]=useState('');const [english,setEnglish]=useState('');
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  async function decide(){
    if(busy)return;key.current??=crypto.randomUUID();setBusy(true);setMessage('');
    try{
      const {error}=await createClient().rpc('rpc_assessor_chapter_review_decide',{
        p_key:key.current,p_program_id:state.programId,p_bhw_user_id:state.learnerId,
        p_fil:fil,p_en:english});
      if(error)throw error;
      setMessage(en?'Chapter review recorded.':'Naitala ang pagsusuri ng kabanata.');router.refresh();
    }catch{setMessage(en?'Review could not be released. Recheck current evidence and authority.':
      'Hindi nailabas ang pagsusuri. Suriin ang kasalukuyang ebidensya at pahintulot.');}
    finally{setBusy(false);}
  }
  return <div className="space-y-5">
    <p className="rounded bg-primary/5 p-3 text-sm">{en?'Review every required component and its current prerequisites. Missing or unsafe evidence stays pending. A component result alone never issues a chapter certificate.':
      'Suriin ang bawat kinakailangang bahagi at kasalukuyang paunang kailangan. Ang kulang o hindi ligtas na ebidensya ay mananatiling pending.'}</p>
    {state.components.map(item=><section key={item.moduleId} className="rounded-xl border border-ink/20 p-5">
      <h2 className="text-lg font-semibold">{en?item.titleEn:item.titleFil}</h2>
      <p className="mt-2 text-sm">{en?'Latest formal outcome:':'Pinakahuling pormal na resulta:'} {item.outcome?outcomeText(item.outcome,en):(en?'No submitted attempt':'Wala pang naisumiteng pagtatasa')}</p>
      <p className="text-sm">{item.learnerReady&&item.contractCurrent?
        (en?'Current prerequisites and rubric confirmed.':'Napatunayan ang kasalukuyang paunang kailangan at rubric.'):
        (en?'Prerequisite or approved rubric needs review.':'May paunang kailangan o rubric na dapat suriin.')}</p>
      {!item.feedbackReleased&&item.attemptId&&<p className="text-sm">{en?'Component feedback has not been released.':'Hindi pa nailalabas ang feedback sa bahaging ito.'}</p>}
      {item.reassessment&&<p className="mt-2 rounded bg-primary/5 p-3 text-sm">
        {en?'Further practice linked to this attempt:':'Dagdag na pagsasanay na naka-link sa pagtatasa:'} {item.reassessment.practiceNote}
      </p>}
      {item.learnerBlockers.length>0&&<p className="mt-1 text-sm">{item.learnerBlockers.join(', ')}</p>}
      {item.criteria?.length?<ul className="mt-3 space-y-2">{item.criteria.map(criterion=>{
        const record=item.evidence?.find(e=>e.id===criterion.id);
        return <li key={criterion.id} className="rounded border border-ink/15 p-3">
          <h3 className="font-medium">{en?criterion.en:criterion.fil}</h3>
          <p className="text-sm">{record?evidenceText(record.sufficiency,en):(en?'No evidence':'Walang ebidensya')}
            {record?.rating?` · ${evidenceText(record.rating,en)}`:''}</p>
          {record?.facts&&<p className="mt-1">{record.facts}</p>}
          {record?.nextStep&&<p className="mt-1 text-sm">{en?'Next:':'Susunod:'} {record.nextStep}</p>}
        </li>;
      })}</ul>:null}
      <ComponentActions item={item} en={en}/>
    </section>)}
    <section className="rounded-xl border border-primary/30 p-5">
      <h2 className="text-lg font-semibold">{chapter1Terms.review[lang]}</h2>
      <p className="mt-2">{en?'Current outcome:':'Kasalukuyang resulta:'} <strong>{outcomeText(state.suggestedOutcome,en)}</strong></p>
      <p className="mt-2 text-sm">{en?'The server recalculates this from all components when you release the review. Insufficient evidence stays pending; practice needs do not count as a pass.':
        'Muling susuriin ng server ang lahat ng bahagi sa paglabas ng pasya. Ang kulang na ebidensya ay pending; ang kailangan ng pagsasanay ay hindi pass.'}</p>
      {state.latestReview&&<div className="mt-3 rounded bg-primary/5 p-3">
        <p>{en?'Last released review:':'Huling inilabas na pagsusuri:'} {outcomeText(state.latestReview.outcome,en)}</p>
        <p className="mt-1 text-sm">{en?state.latestReview.summaryEn:state.latestReview.summaryFil}</p>
        {state.latestReview.certificateId&&<p className="mt-1 text-sm">{en?'One Chapter 1 certificate is recorded.':'May naitalang isang sertipiko ng Kabanata 1.'}</p>}
      </div>}
      {state.canDecide&&!state.latestReview?.certificateId&&<div className="mt-4">
        <label className="block text-sm">Buod sa Filipino
          <textarea className={field} rows={2} maxLength={2000} value={fil}
            onChange={event=>{setFil(event.target.value);key.current=null;}}/></label>
        <label className="mt-2 block text-sm">Summary in English
          <textarea className={field} rows={2} maxLength={2000} value={english}
            onChange={event=>{setEnglish(event.target.value);key.current=null;}}/></label>
        <button disabled={busy||fil.trim().length<10||english.trim().length<10} onClick={decide}
          className="mt-3 min-h-11 rounded bg-primary px-4 text-on-primary disabled:opacity-50">
          {chapter1Terms.release[lang]}</button>
      </div>}
      {!state.canDecide&&<p className="mt-3 text-sm">{en?'Review is not available until at least one formal attempt and current authority are present.':
        'Hindi pa maaaring magpasya hangga’t walang pormal na pagtatasa at kasalukuyang pahintulot.'}</p>}
      {message&&<p role="status" className="mt-2 text-sm">{message}</p>}
    </section>
  </div>;
}

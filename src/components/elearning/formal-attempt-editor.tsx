'use client';

import {useRouter} from 'next/navigation';
import {useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {type FormalEvidence,type FormalState} from '@/lib/assessor/formal-attempt';
import {chapter1Terms} from '@/lib/assessor/chapter1-workflow-parity';

const field='min-h-11 w-full rounded border border-ink/30 bg-canvas px-3 py-2';
export function FormalAttemptEditor({state,lang}:{state:FormalState;lang:'fil'|'en'}){
  const en=lang==='en';const router=useRouter();
  const startKey=useRef<string|null>(null);const submitKey=useRef<string|null>(null);
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const [review,setReview]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [evidence,setEvidence]=useState<FormalEvidence[]>(state.attempt?.evidence??[]);
  const [revision,setRevision]=useState(state.attempt?.revision??0);
  const attempt=state.attempt;
  const label=(fil:string,english:string)=>en?english:fil;
  const entryFor=(id:string)=>evidence.find(item=>item.id===id)??{
    id,sufficiency:'not_observed' as const,rating:null,facts:'',nextStep:''};
  const update=(id:string,change:Partial<FormalEvidence>)=>{
    setReview(false);setDirty(true);submitKey.current=null;
    setEvidence(previous=>{
      const existing=previous.find(item=>item.id===id)??entryFor(id);
      return [...previous.filter(item=>item.id!==id),{...existing,...change}];
    });
  };
  async function start(){
    if(busy)return;startKey.current??=crypto.randomUUID();setBusy(true);setMessage('');
    const {error}=await createClient().rpc('rpc_assessor_formal_start',{
      p_key:startKey.current,p_request_id:state.requestId});
    setBusy(false);
    if(error)setMessage(label('Hindi masimulan. Suriin ang kasalukuyang pahintulot at kahandaan.',
      'Could not start. Recheck current authority and readiness.'));
    else router.refresh();
  }
  async function save(){
    if(!attempt||busy)return;setBusy(true);setMessage('');
    const {data,error}=await createClient().rpc('rpc_assessor_formal_save',{
      p_attempt_id:attempt.id,p_expected_revision:revision,p_evidence:evidence});
    setBusy(false);
    if(error){setReview(false);setMessage(label('Hindi na-save. Maaaring nagbago ang draft, pahintulot, o rubric. I-reload bago mag-edit muli.',
      'Save failed. The draft, authority, or rubric may have changed. Reload before editing again.'));}
    else{setRevision(data as number);setDirty(false);setMessage(label('Na-save ang draft.','Draft saved.'));router.refresh();}
  }
  async function submit(){
    if(!attempt||busy)return;submitKey.current??=crypto.randomUUID();setBusy(true);setMessage('');
    const {data,error}=await createClient().rpc('rpc_assessor_formal_submit',{
      p_key:submitKey.current,p_attempt_id:attempt.id,p_expected_revision:revision});
    setBusy(false);
    if(error){setReview(false);setMessage(label('Hindi naisumite. Suriin ang lahat ng ebidensya at kasalukuyang pahintulot, saka i-reload.',
      'Submission failed. Check all evidence and current authority, then reload.'));}
    else{setMessage(label(`Naisumite: ${data}.`,`Submitted: ${data}.`));router.refresh();}
  }
  if(!attempt)return <section className="rounded-xl border border-ink/20 p-5">
    <p>{label('Ang kasunduan lamang ay hindi pormal na pasya. Simulan nang tahasan ang pagtatasa kapag handa na.',
      'An arrangement alone is not a formal decision. Explicitly start the assessment when ready.')}</p>
    {state.canStart?<button onClick={start} disabled={busy} className="mt-4 min-h-11 rounded bg-primary px-4 text-on-primary disabled:opacity-50">
      {chapter1Terms.start[lang]}</button>
      :<p role="status" className="mt-3">{label('Hindi pa maaaring simulan. Suriin ang kahandaan, pagtatalaga, at pahintulot.',
        'Cannot start yet. Check readiness, assignment, and authority.')}</p>}
    {message&&<p role="alert" className="mt-3">{message}</p>}
  </section>;
  if(attempt.status==='submitted')return <section className="rounded-xl border border-ink/20 p-5">
    <h2 className="text-lg font-semibold">{label('Naisumiteng pormal na pagtatasa','Submitted formal assessment')}</h2>
    <p className="mt-2">{label('Resulta:','Outcome:')} {attempt.outcome}</p>
    <ul className="mt-3 space-y-3">{attempt.criteria.map(criterion=>{
      const saved=attempt.evidence.find(item=>item.id===criterion.id);
      return <li key={criterion.id} className="rounded border border-ink/15 p-3">
        <h3 className="font-medium">{en?criterion.en:criterion.fil}</h3>
        <p className="text-sm">{saved?.sufficiency}{saved?.rating?` · ${saved.rating}`:''}</p>
        <p className="mt-1">{saved?.facts}</p>
        <p className="mt-1 text-sm">{label('Susunod:','Next:')} {saved?.nextStep}</p>
      </li>;
    })}</ul>
    <p className="mt-2 text-sm">{label('Ang resulta ng bahaging ito ay hindi sertipiko ng kabanata.',
      'This component outcome is not a chapter certificate.')}</p>
  </section>;
  return <section className="space-y-5">
    <p className="rounded bg-primary/5 p-3 text-sm">{label('Itala lamang ang direktang naobserbahan. Ang hindi nakita o kulang na ebidensya ay walang rating. I-save ang draft bago suriin at isumite.',
      'Record only directly observed work. Unseen or insufficient evidence has no rating. Save the draft before review and submission.')}</p>
    {attempt.criteria.map(criterion=>{
      const entry=entryFor(criterion.id);const sufficient=entry.sufficiency==='sufficient';
      const localSafetyDemo=criterion.id==='chapter-1:08-osh:lesson:safety-demonstrate:criterion-1';
      return <fieldset key={criterion.id} className="rounded-xl border border-ink/20 p-5">
        <legend className="px-1 font-semibold">{en?criterion.en:criterion.fil}</legend>
        <p className="mt-2 text-sm">{en?criterion.rubric.observable.en:criterion.rubric.observable.fil}</p>
        {localSafetyDemo&&<p className="mt-3 rounded border border-primary/30 bg-primary/5 p-3 text-sm">{label(
          'Gamitin ang blangkong lokal na setup card para sa LGU at session na ito. Kumpirmahin kasama ng awtorisadong lokal na clinical trainer ang checklist, pangunahing reporting contact, backup at agarang ruta sa qualified evaluation bago ang physical dummy demonstration. Kung may hindi pa kumpirmado, ihinto ang demonstration at piliin ang Hindi naobserbahan. Hindi sapat ang paper rehearsal para pumasa.',
          'Use the blank local setup card for this LGU and session. With the authorized local clinical trainer, confirm the checklist, primary reporting contact, backup and immediate qualified evaluation route before the physical dummy demonstration. If any are unconfirmed, pause the demonstration and choose Not observed. A paper rehearsal cannot pass this criterion.')}</p>}
        <label className="mt-3 block text-sm">{label('Sapat ba ang ebidensya?','Evidence sufficiency')}
          <select className={field} value={entry.sufficiency} onChange={event=>update(criterion.id,{
            sufficiency:event.target.value as FormalEvidence['sufficiency'],rating:null})}>
            <option value="not_observed">{label('Hindi naobserbahan','Not observed')}</option>
            <option value="insufficient">{label('Kulang ang ebidensya','Insufficient evidence')}</option>
            <option value="sufficient">{label('Sapat ang ebidensya','Sufficient evidence')}</option>
          </select></label>
        {sufficient&&<label className="mt-3 block text-sm">{label('Rating ayon sa rubric','Rating from rubric')}
          <select className={field} value={entry.rating??''} onChange={event=>update(criterion.id,{
            rating:event.target.value as FormalEvidence['rating']||null})}>
            <option value="">{label('Pumili','Choose')}</option>
            {(['kaya_na','kailangan_practice','hindi_pa'] as const).map(level=><option key={level} value={level}>
              {en?criterion.rubric.levels[level].en:criterion.rubric.levels[level].fil}</option>)}
          </select></label>}
        <label className="mt-3 block text-sm">{label('Naobserbahang pangyayari o dahilan ng kakulangan','Observed facts or reason evidence is missing')}
          <textarea className={field} rows={3} maxLength={4000} value={entry.facts}
            onChange={event=>update(criterion.id,{facts:event.target.value})}/></label>
        <label className="mt-3 block text-sm">{label('Susunod na hakbang','Next step')}
          <textarea className={field} rows={2} maxLength={1000} value={entry.nextStep}
            onChange={event=>update(criterion.id,{nextStep:event.target.value})}/></label>
      </fieldset>;
    })}
    <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={save}
      className="min-h-11 rounded bg-primary px-4 text-on-primary disabled:opacity-50">{chapter1Terms.draft[lang]}</button>
      <button disabled={busy||dirty} onClick={()=>setReview(true)} className="min-h-11 rounded border px-4 disabled:opacity-50">
        {label('Suriin para isumite','Review for submission')}</button></div>
    {dirty&&<p className="text-sm">{label('I-save muna ang mga pagbabago bago suriin.','Save changes before review.')}</p>}
    {review&&<div className="rounded-xl border border-primary/40 p-5">
      <h2 className="font-semibold">{label('Suriin ang ebidensya','Review evidence')}</h2>
      <ul className="mt-2 list-disc pl-5">{attempt.criteria.map(c=>{
        const e=entryFor(c.id);return <li key={c.id}>{en?c.en:c.fil}: {e.sufficiency}
          {e.rating?` · ${e.rating}`:''} · {e.facts||label('Walang paliwanag','No explanation')}</li>;})}</ul>
      <p className="mt-3 text-sm">{label('Dapat may paliwanag at susunod na hakbang ang bawat pamantayan. Ang pag-submit ay pinal at hindi nagbibigay ng sertipiko.',
        'Every criterion needs facts or an explanation and a next step. Submission is final and does not issue a certificate.')}</p>
      <button disabled={busy} onClick={submit} className="mt-3 min-h-11 rounded bg-primary px-4 text-on-primary disabled:opacity-50">
        {chapter1Terms.submit[lang]}</button>
    </div>}
    {message&&<p role="status" className="text-sm">{message}</p>}
  </section>;
}

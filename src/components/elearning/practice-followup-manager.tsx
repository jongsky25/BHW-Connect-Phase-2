'use client';

import {useRouter} from 'next/navigation';
import {useRef,useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import {followupDueLabel,type PracticeFollowup,type PracticeFollowupState} from '@/lib/assessor/practice-followup';

type Lang='fil'|'en';
type Attempt={id:string;lessonId:string;criterionId:string;recordedAt:string};
const field='min-h-11 w-full rounded-md border border-ink/30 bg-canvas px-3 py-2 focus-visible:outline-2 focus-visible:outline-primary';

function FollowupCreate({attempt,staff,actorId,lang}: {
  attempt:Attempt;staff:PracticeFollowupState['staff'];actorId:string;lang:Lang;
}){
  const router=useRouter();const pick=(fil:string,en:string)=>lang==='en'?en:fil;
  const [action,setAction]=useState<'practice'|'observation'>('practice');
  const [assignee,setAssignee]=useState(actorId);
  const [date,setDate]=useState('');const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');const requestId=useRef<string|null>(null);
  const change=()=>{requestId.current=null;setMessage('');};
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving||!assignee)return;
    const agreedAt=date?new Date(date).toISOString():null;
    requestId.current??=crypto.randomUUID();setSaving(true);setMessage('');
    try{
      const {error}=await createClient().rpc('rpc_assessor_practice_followup_create',{
        p_request_id:requestId.current,p_source_attempt_id:attempt.id,p_action:action,
        p_assigned_to:assignee,p_agreed_at:agreedAt,
      });
      if(error)throw error;
      setMessage(pick('Naitala ang follow-up.','Follow-up saved.'));router.refresh();
    }catch{setMessage(pick('Hindi naitala. Nananatili ang plano; subukang muli.','Save failed. Your plan is still here; retry.'));}
    finally{setSaving(false);}
  }
  return <form onSubmit={save} className="mt-3 grid gap-3 rounded-md border border-ink/15 p-3" aria-label={pick('Magplano ng follow-up','Plan follow-up')}>
    <p className="font-medium">{pick('Susunod na gawain','Next action')}</p>
    <div className="grid gap-3 sm:grid-cols-3">
      <label>{pick('Gawain','Action')}<select className={field} value={action} onChange={event=>{setAction(event.target.value as typeof action);change();}}>
        <option value="practice">{pick('Pagsasanay','Practice')}</option><option value="observation">{pick('Obserbasyon','Observation')}</option>
      </select></label>
      <label>{pick('Responsableng assessor','Responsible assessor')}<select className={field} value={assignee} onChange={event=>{setAssignee(event.target.value);change();}} required>
        {staff.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}
      </select></label>
      <label>{pick('Napagkasunduang petsa (opsyonal)','Agreed date (optional)')}<input className={field} type="datetime-local" value={date} onChange={event=>{setDate(event.target.value);change();}}/></label>
    </div>
    <button disabled={saving||!staff.length} className="min-h-11 w-fit rounded-md bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{pick('Itala ang plano','Save plan')}</button>
    {message&&<p role="status">{message}</p>}
  </form>;
}

function FollowupUpdate({plan,staff,attempts,actorId,lang}: {
  plan:PracticeFollowup;staff:PracticeFollowupState['staff'];attempts:Attempt[];actorId:string;lang:Lang;
}){
  const router=useRouter();const pick=(fil:string,en:string)=>lang==='en'?en:fil;
  const [status,setStatus]=useState<'open'|'completed'|'cancelled'>('open');
  const [assignee,setAssignee]=useState(plan.assignedTo);
  const [date,setDate]=useState(plan.agreedAt?new Date(plan.agreedAt).toISOString().slice(0,16):'');
  const [retry,setRetry]=useState('');const [note,setNote]=useState('');
  const [saving,setSaving]=useState(false);const [message,setMessage]=useState('');
  const requestId=useRef<string|null>(null);
  const change=()=>{requestId.current=null;setMessage('');};
  const retryOptions=attempts.filter(a=>a.id!==plan.sourceAttemptId&&a.lessonId===plan.lessonId
    &&a.criterionId===plan.criterionId&&Date.parse(a.recordedAt)>=Date.parse(plan.createdAt));
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving)return;
    const agreedAt=date?new Date(date).toISOString():null;
    requestId.current??=crypto.randomUUID();setSaving(true);setMessage('');
    try{
      const {error}=await createClient().rpc('rpc_assessor_practice_followup_update',{
        p_request_id:requestId.current,p_followup_id:plan.id,p_status:status,
        p_assigned_to:status==='open'?assignee:plan.assignedTo,p_agreed_at:agreedAt,
        p_retry_attempt_id:status==='completed'&&retry?retry:null,
        p_completion_note:status==='completed'&&note.trim()?note.trim():null,
      });
      if(error)throw error;
      setMessage(pick('Na-update ang follow-up.','Follow-up updated.'));router.refresh();
    }catch{setMessage(pick('Hindi na-update. Nananatili ang iyong pinili; subukang muli.','Update failed. Your choices are still here; retry.'));}
    finally{setSaving(false);}
  }
  return <form onSubmit={save} className="mt-3 grid gap-3" aria-label={pick('Baguhin ang follow-up','Update follow-up')}>
    <div className="grid gap-3 sm:grid-cols-3">
      <label>{pick('Katayuan','Status')}<select className={field} value={status} onChange={event=>{setStatus(event.target.value as typeof status);change();}}>
        <option value="open">{pick('Bukas / baguhin','Open / change')}</option>{actorId===plan.assignedTo&&<option value="completed">{pick('Natapos','Completed')}</option>}
        <option value="cancelled">{pick('Kanselahin','Cancel')}</option>
      </select></label>
      {status==='open'&&<label>{pick('Responsableng assessor','Responsible assessor')}<select className={field} value={assignee} onChange={event=>{setAssignee(event.target.value);change();}}>
        {staff.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}
      </select></label>}
      {status==='open'&&<label>{pick('Bagong petsa (opsyonal)','New date (optional)')}<input className={field} type="datetime-local" value={date} onChange={event=>{setDate(event.target.value);change();}}/></label>}
    </div>
    {status==='completed'&&<><label>{pick('Bagong ebidensiya (kung may obserbasyon)','New evidence (if observed)')}
      <select className={field} value={retry} onChange={event=>{setRetry(event.target.value);change();}}>
        <option value="">{pick('Walang iniuugnay na tala','No linked attempt')}</option>
        {retryOptions.map(a=><option key={a.id} value={a.id}>{new Date(a.recordedAt).toLocaleString(lang==='fil'?'fil-PH':'en-PH')} · {a.id.slice(0,8)}</option>)}
      </select></label>
      {!retry&&<label>{pick('Ano ang natapos?','What was completed?')}<textarea className={field} minLength={5} maxLength={1000} required value={note} onChange={event=>{setNote(event.target.value);change();}}/></label>}
    </>}
    <button disabled={saving} className="min-h-11 w-fit rounded-md bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{pick('I-save ang pagbabago','Save change')}</button>
    {message&&<p role="status">{message}</p>}
  </form>;
}

export function PracticeFollowupManager({state,attempts,actorId,canRecord,lang}: {
  state:PracticeFollowupState;attempts:Attempt[];actorId:string;canRecord:boolean;lang:Lang;
}){
  const pick=(fil:string,en:string)=>lang==='en'?en:fil;
  const used=new Set(state.followups.map(plan=>plan.sourceAttemptId));
  return <section className="space-y-4" aria-label={pick('Plano ng follow-up','Follow-up plans')}>
    <h2 className="text-lg font-semibold">{pick('Susunod na gawain at follow-up','Next actions and follow-ups')}</h2>
    {!state.followups.length&&!attempts.length&&<p>{pick('Wala pang plano.','No plans yet.')}</p>}
    {state.followups.map(plan=><article key={plan.id} className="rounded-lg border border-ink/20 p-4">
      <p className="font-medium">{plan.action==='practice'?pick('Pagsasanay','Practice'):pick('Obserbasyon','Observation')} · {plan.assignedName}</p>
      <p className="text-sm">{plan.status==='open'?pick('Bukas','Open'):plan.status==='completed'?pick('Natapos','Completed'):pick('Kinansela','Cancelled')}
        {followupDueLabel(plan)==='overdue'&&` · ${pick('Lampas sa petsa','Overdue')}`}
        {plan.agreedAt&&` · ${new Date(plan.agreedAt).toLocaleString(lang==='fil'?'fil-PH':'en-PH')}`}</p>
      {plan.retryAttemptId&&<p className="text-sm">{pick('Naka-link ang bagong ebidensiya','New evidence linked')} · {plan.retryAttemptId}</p>}
      {plan.status==='open'&&canRecord&&<FollowupUpdate plan={plan} staff={state.staff} attempts={attempts} actorId={actorId} lang={lang}/>}
    </article>)}
    {canRecord&&attempts.filter(a=>!used.has(a.id)).map(attempt=><article key={attempt.id} className="rounded-lg border border-ink/20 p-4">
      <p className="font-medium">{pick('Tala ng pagsasanay','Practice record')} · {new Date(attempt.recordedAt).toLocaleString(lang==='fil'?'fil-PH':'en-PH')}</p>
      <FollowupCreate attempt={attempt} staff={state.staff} actorId={actorId} lang={lang}/>
    </article>)}
  </section>;
}

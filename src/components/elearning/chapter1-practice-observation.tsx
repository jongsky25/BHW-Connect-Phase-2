'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,useState,type FormEvent, type MouseEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import type {LessonPracticeContext} from '@/lib/assessor/lesson-observation';

type Lang='fil'|'en';
type Sufficiency='not_observed'|'insufficient'|'sufficient';
type Rating='kaya_na'|'kailangan_practice'|'hindi_pa';
type Attempt={id:string;lessonId:string;criterionId:string;criterionVersion:string;sufficiency:Sufficiency;
  rating:Rating|null;facts:string;prompts:string;privateNotes:string;feedback:string;nextStep:string;
  feedbackReleasedAt:string|null;priorAttemptId:string|null;linkKind:string|null;recordedAt:string};
type Legacy={id:string;observed_at:string;level:string;note:string;indicator_snapshot:unknown;objective_index:number};
const field='w-full min-h-11 rounded-md border border-ink/30 bg-canvas px-3 py-2 focus-visible:outline-2 focus-visible:outline-primary';
const button='min-h-11 rounded-md border border-primary bg-primary px-4 py-2 font-medium text-on-primary disabled:opacity-50';

export function Chapter1PracticeObservation({context,lang,backHref,workspaceHref,history,legacy}: {
  context:LessonPracticeContext;lang:Lang;backHref:string;workspaceHref?:string;
  history:Attempt[];legacy:Legacy[];
}) {
  const router=useRouter();
  const pick=(fil:string,en:string)=>lang==='en'?en:fil;
  const [criterionKey,setCriterionKey]=useState(context.criteria[0]?`${context.criteria[0].id}:${context.criteria[0].version}`:'');
  const [sufficiency,setSufficiency]=useState<Sufficiency|'none'>('none');
  const [support,setSupport]=useState<'independent'|'prompted'>('independent');
  const [rating,setRating]=useState<Rating|null>(null);
  const [facts,setFacts]=useState('');
  const [prompts,setPrompts]=useState('');
  const [privateNotes,setPrivateNotes]=useState('');
  const [feedback,setFeedback]=useState('');
  const [nextStep,setNextStep]=useState('');
  const [release,setRelease]=useState(false);
  const [priorId,setPriorId]=useState<string|null>(null);
  const [dirty,setDirty]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [saved,setSaved]=useState<string|null>(null);
  const requestId=useRef<string|null>(null);
  const criterion=context.criteria.find(item=>`${item.id}:${item.version}`===criterionKey)??context.criteria[0];

  useEffect(()=>{
    if(!dirty)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return ()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);
  const change=()=>{setDirty(true);setSaved(null);setError('');requestId.current=null;};
  const confirmDiscard=()=>!dirty||window.confirm(pick('Itapon ang hindi pa naitalang ebidensiya?','Discard unsaved evidence?'));
  const leave=(event:MouseEvent<HTMLAnchorElement>)=>{if(!confirmDiscard())event.preventDefault();};
  function reset(nextCriterion?:string){
    setCriterionKey(nextCriterion??criterionKey);setSufficiency('none');setSupport('independent');setRating(null);
    setFacts('');setPrompts('');setPrivateNotes('');setFeedback('');setNextStep('');setRelease(false);
    setPriorId(null);setDirty(false);setSaved(null);setError('');requestId.current=null;
  }
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!criterion||!criterion.recordable||!context.learner||!context.canRecord||saving)return;
    if(sufficiency==='none'||facts.trim().length<10||nextStep.trim().length<3
      ||(sufficiency==='sufficient'&&!rating)||(support==='prompted'&&!prompts.trim())
      ||(release&&!feedback.trim())){
      setError(pick('Kumpletuhin ang ebidensiya, susunod na hakbang, at mga kinakailangang detalye.','Complete the evidence, next step, and required details.'));
      return;
    }
    setSaving(true);setError('');
    requestId.current??=crypto.randomUUID();
    try{
      const {data,error:rpcError}=await createClient().rpc('rpc_assessor_practice_record',{
        p_request_id:requestId.current,p_bhw_user_id:context.learner.id,p_chapter_id:context.chapterId,
        p_criterion_id:criterion.id,p_criterion_version:criterion.version,
        p_sufficiency:sufficiency,p_rating:sufficiency==='sufficient'?rating:null,
        p_facts:facts.trim(),p_prompts:support==='prompted'?prompts.trim():'',
        p_private_notes:privateNotes.trim(),p_feedback:feedback.trim(),p_next_step:nextStep.trim(),
        p_release_feedback:release,p_session_activity_id:null,p_prior_attempt_id:priorId,
        p_link_kind:priorId?'retry':null,
      });
      if(rpcError||!data)throw new Error(rpcError?.message??'Save failed');
      setSaved(String(data));setDirty(false);router.refresh();
    }catch{
      setError(pick('Hindi naitala. Nananatili ang iyong teksto; subukang muli o i-refresh ang pahintulot.','Save failed. Your text is still here; retry or refresh your access.'));
    }finally{setSaving(false);}
  }

  return <div className="space-y-6">
    <nav className="flex flex-wrap gap-4 text-sm">
      <Link prefetch={false} className="min-h-11 content-center underline" href={backHref} onClick={leave}>{pick('Bumalik sa aralin','Back to lesson')}</Link>
      {workspaceHref&&<Link prefetch={false} className="min-h-11 content-center underline" href={workspaceHref} onClick={leave}>{pick('Bumalik sa working area','Back to working area')}</Link>}
    </nav>
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-6">
      <h1 className="text-xl font-semibold">{pick('Obserbahan ang BHW · pagsasanay','Observe a BHW · practice')}</h1>
      <p className="mt-2">{context.learner?.name} · {context.learner?.barangay} · {pick('Aralin 1.6.2','Lesson 1.6.2')}</p>
      <p className="mt-2 text-sm">{pick('Ang pagsasanay ay hindi pormal na pagpasa o sertipiko.','Practice does not create a formal pass or certificate.')}</p>
    </section>
    {!context.criteria.length?<p role="status" className="rounded-lg border border-ink/20 p-4">{pick('Wala pang inaprubahang pamantayan para sa araling ito. Hindi maaaring magtala.','No reviewed criterion is available for this lesson. Recording is unavailable.')}</p>:<>
      {!context.canRecord&&<p role="status" className="rounded-lg border border-ink/20 p-4">{pick('Hindi pa bukas ang pagtatala ng pagsasanay para sa iyong cohort o kwalipikasyon.','Practice recording is not enabled for your cohort or qualification yet.')}</p>}
      <section className="rounded-xl border border-ink/20 p-4 sm:p-6" aria-label={pick('Pamantayan sa aralin','Lesson criterion')}>
        <h2 className="font-semibold">{pick('Inaprubahang pamantayan','Reviewed criterion')}</h2>
        {context.criteria.length>1&&<label className="mt-3 block font-medium">{pick('Pumili ng pamantayan','Choose criterion')}
          <select className={`${field} mt-1`} value={criterionKey} onChange={event=>{
            if(confirmDiscard())reset(event.target.value);
          }}>{context.criteria.map(item=><option key={`${item.id}:${item.version}`} value={`${item.id}:${item.version}`}>{item.id} · {item.version}</option>)}</select>
        </label>}
        {criterion&&<><p className="mt-3">{criterion.rubric.observable[lang]}</p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-3">{(['kaya_na','kailangan_practice','hindi_pa'] as const).map(level=><div key={level} className="rounded-md bg-ink/5 p-3"><dt className="font-medium">{level==='kaya_na'?pick('Kaya na','Can do'):level==='kailangan_practice'?pick('Kailangan ng pagsasanay','Needs practice'):pick('Hindi pa','Not yet')}</dt><dd className="mt-1 text-sm">{criterion.rubric.levels[level][lang]}</dd></div>)}</dl>
        </>}
      </section>
      {context.canRecord&&criterion&&!criterion.recordable&&<p role="status">{pick('Hindi pa maaaring itala ang pamantayang ito.','This criterion is not yet recordable.')}</p>}
      {context.canRecord&&criterion?.recordable&&<form onSubmit={save} className="space-y-5 rounded-xl border border-ink/20 p-4 sm:p-6" aria-label={pick('Itala ang obserbasyon','Record observation')}>
        <h2 className="text-lg font-semibold">{pick('Ebidensiya muna, saka rating','Evidence before rating')}</h2>
        {priorId&&<p className="rounded-md bg-primary/10 p-3">{pick('Bagong pagsubok na nakaugnay sa naunang tala','New attempt linked to earlier record')} · {priorId}</p>}
        <fieldset><legend className="font-medium">{pick('Ano ang nasaksihan?','What was observed?')}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">{([
            ['not_observed',pick('Hindi nasaksihan','Not observed')],
            ['insufficient',pick('Hindi sapat ang ebidensiya','Insufficient evidence')],
            ['sufficient',pick('May sapat na direktang ebidensiya','Sufficient direct evidence')],
          ] as const).map(([value,label])=><label key={value} className="flex min-h-11 items-center gap-2 rounded-md border border-ink/20 p-3"><input type="radio" name="sufficiency" checked={sufficiency===value} onChange={()=>{setSufficiency(value);setRating(null);change();}}/>{label}</label>)}</div>
        </fieldset>
        <label className="block font-medium">{sufficiency==='not_observed'?pick('Dahilan kung bakit hindi nasaksihan','Why it was not observed'):pick('Eksaktong nasaksihang kilos at salita','Exact actions and words observed')}
          <textarea className={`${field} mt-1 min-h-28`} maxLength={4000} value={facts} onChange={event=>{setFacts(event.target.value);change();}} required minLength={10}/>
        </label>
        {sufficiency==='sufficient'&&<><fieldset><legend className="font-medium">{pick('Suporta habang ginagawa','Support during attempt')}</legend>
          <div className="mt-2 flex flex-wrap gap-4">{(['independent','prompted'] as const).map(value=><label key={value} className="flex min-h-11 items-center gap-2"><input type="radio" name="support" checked={support===value} onChange={()=>{setSupport(value);if(value==='independent')setPrompts('');change();}}/>{value==='independent'?pick('Walang prompt','Independent'):pick('May prompt','Prompted')}</label>)}</div>
        </fieldset>{support==='prompted'&&<label className="block font-medium">{pick('Anong prompt ang ibinigay?','What prompt was given?')}<textarea className={`${field} mt-1 min-h-24`} maxLength={2000} value={prompts} onChange={event=>{setPrompts(event.target.value);change();}} required/></label>}
          {facts.trim().length>=10&&<fieldset><legend className="font-medium">{pick('Rating ayon sa inaprubahang anchor','Rating against the reviewed anchor')}</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{(['kaya_na','kailangan_practice','hindi_pa'] as const).map(level=><label key={level} className="flex min-h-11 items-start gap-2 rounded-md border border-ink/20 p-3"><input type="radio" name="rating" checked={rating===level} onChange={()=>{setRating(level);change();}}/><span>{criterion.rubric.levels[level][lang]}</span></label>)}</div></fieldset>}
        </>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="block font-medium">{pick('Pribadong tala ng assessor','Private assessor notes')}<textarea className={`${field} mt-1 min-h-24`} maxLength={2000} value={privateNotes} onChange={event=>{setPrivateNotes(event.target.value);change();}}/></label>
          <label className="block font-medium">{pick('Feedback para sa BHW','Feedback for the BHW')}<textarea className={`${field} mt-1 min-h-24`} maxLength={2000} value={feedback} onChange={event=>{setFeedback(event.target.value);change();}}/></label></div>
        <label className="block font-medium">{pick('Susunod na hakbang','Next step')}<textarea className={`${field} mt-1 min-h-20`} maxLength={1000} minLength={3} required value={nextStep} onChange={event=>{setNextStep(event.target.value);change();}}/></label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={release} onChange={event=>{setRelease(event.target.checked);change();}}/>{pick('Ibahagi ang feedback at susunod na hakbang sa BHW kapag naitala','Release feedback and next step to the BHW when saved')}</label>
        {release&&<p className="rounded-md border border-primary/20 p-3 text-sm"><strong>{pick('Makikita ng BHW:','BHW will see:')}</strong> {feedback||pick('Wala pang feedback','No feedback yet')} · {nextStep||pick('Wala pang susunod na hakbang','No next step yet')}</p>}
        {error&&<p role="alert" className="text-danger">{error}</p>}
        {saved&&<p role="status" className="rounded-md bg-success/10 p-3">{pick('Naitala ang obserbasyon.','Observation saved.')} <span className="text-xs">{saved}</span></p>}
        <div className="flex flex-wrap gap-3"><button className={button} disabled={saving||!!saved} type="submit">{saving?pick('Itinatala…','Saving…'):pick('Itala ang obserbasyon','Save observation')}</button>
          {saved&&<button type="button" className="min-h-11 rounded-md border border-ink/30 px-4" onClick={()=>reset()}>{pick('Bagong pagsubok','New attempt')}</button>}</div>
      </form>}
    </>}
    <section className="space-y-3" aria-label={pick('Kasaysayan ng pagsasanay','Practice history')}>
      <h2 className="text-lg font-semibold">{pick('Mga naunang tala ng pagsasanay','Earlier practice records')}</h2>
      {!history.length?<p>{pick('Wala pang bagong tala.','No new records yet.')}</p>:history.map(item=><article key={item.id} className="rounded-lg border border-ink/20 p-4">
        <p className="font-medium">{item.criterionId} · {item.sufficiency} · {item.rating??pick('Walang rating','No rating')}</p>
        <p className="mt-1 text-sm">{new Date(item.recordedAt).toLocaleString(lang==='fil'?'fil-PH':'en-PH')}</p>
        <p className="mt-2">{item.facts}</p>{item.prompts&&<p className="mt-1 text-sm">{pick('Prompt:','Prompt:')} {item.prompts}</p>}
        {item.privateNotes&&<p className="mt-2 text-sm"><strong>{pick('Pribadong tala:','Private notes:')}</strong> {item.privateNotes}</p>}
        {item.feedback&&<p className="mt-2 text-sm"><strong>{pick('Feedback:','Feedback:')}</strong> {item.feedback} {item.feedbackReleasedAt?pick('(ibinahagi)','(released)'):pick('(hindi ibinahagi)','(not released)')}</p>}
        {item.nextStep&&<p className="mt-1 text-sm"><strong>{pick('Susunod na hakbang:','Next step:')}</strong> {item.nextStep}</p>}
        {item.priorAttemptId&&<p className="mt-1 text-xs">{item.linkKind} · {item.priorAttemptId}</p>}
        {context.canRecord&&context.criteria.some(c=>c.id===item.criterionId&&c.version===item.criterionVersion&&c.recordable)&&<button type="button" className="mt-3 min-h-11 underline" onClick={()=>{
          if(confirmDiscard()){reset(`${item.criterionId}:${item.criterionVersion}`);setPriorId(item.id);}
        }}>{pick('Itala ang bagong pagsubok','Record a new attempt')}</button>}
      </article>)}
    </section>
    <section className="space-y-3" aria-label={pick('Lumang kasaysayan','Legacy history')}>
      <h2 className="text-lg font-semibold">{pick('Lumang tala ng obserbasyon','Legacy observation history')}</h2>
      <p className="text-sm">{pick('Makasaysayang tala lamang; hindi ito inaprubahang ebidensiya para sa bagong pormal na pagtatasa.','History only; these records are not approved evidence for the revised formal assessment.')}</p>
      {!legacy.length?<p>{pick('Walang lumang tala para sa subchapter na ito.','No legacy records for this subchapter.')}</p>:legacy.map(item=><article key={item.id} className="rounded-lg border border-ink/20 p-4"><p>{item.level} · {new Date(item.observed_at).toLocaleDateString(lang==='fil'?'fil-PH':'en-PH')}</p>{item.note&&<p className="mt-1 text-sm">{item.note}</p>}</article>)}
    </section>
  </div>;
}

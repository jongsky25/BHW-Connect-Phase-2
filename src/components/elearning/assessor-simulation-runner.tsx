'use client';
import Link from 'next/link';
import {useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {parseSimulationState,type SimulationState,type SimulationAction} from '@/lib/assessor/simulation-runner';
import {storyScenes,preparation,practiceFacts,modelNote,chapterComponents,type StoryText} from '@/lib/assessor/simulation-storyboard';
import {chapter1Terms,checkpointParity} from '@/lib/assessor/chapter1-workflow-parity';
import lessonRubric from '../../../content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify/competency.json';

export function AssessorSimulationRunner({initial,locale:initialLocale,chapterHref,workspaceHref}:{initial:SimulationState;locale:string;chapterHref:string;workspaceHref:string}) {
 const [state,setState]=useState(initial);
 const [locale,setLocale]=useState<'en'|'fil'>(initialLocale==='en'?'en':'fil');
 const [index,setIndex]=useState(Math.min(initial.next,10));
 const [facts,setFacts]=useState(initial.facts);
 const [note,setNote]=useState(initial.note);
 const [hint,setHint]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(false);
 const [feedback,setFeedback]=useState<StoryText|null>(null);
 const pending=useRef(false);
 const heading=useRef<HTMLHeadingElement>(null);
 const current=storyScenes[index];
 const parity=checkpointParity[current.id as keyof typeof checkpointParity];
 const label=(en:string,fil:string)=>locale==='en'?en:fil;
 const text=(value:StoryText)=>value[locale];
 const needsGuide=current.id==='prepare';
 const needsEvidence=current.id==='observe';
 const guide=state.viewStep===2?'learner':state.viewStep>0?'guide':'closed';
 const rubric=lessonRubric.observation_indicators[0];
 const editable=index===state.next;
 const evidenceChanged=note!==state.note||JSON.stringify(facts)!==JSON.stringify(state.facts);
 const evidenceReady=facts.length===practiceFacts.length&&note.trim().length>0;
 const choiceBlocked=(needsGuide&&state.viewStep!==3)||(needsEvidence&&(evidenceChanged||!evidenceReady));
 const nextInstruction=state.next===11
  ? state.receipt
   ? label('Completion is recorded. You can review the checkpoints or return to your preparation.','Naitala na ang pagkumpleto. Maaari mong balikan ang mga hakbang o bumalik sa iyong paghahanda.')
   : label('All 11 checkpoints are recorded. Review the summary below, then save your completion receipt.','Naitala na ang lahat ng 11 hakbang. Basahin ang buod sa ibaba, saka i-save ang tala ng pagkumpleto.')
  : !editable
   ? label('You are reviewing a recorded checkpoint. Return to the first unfinished checkpoint to continue.','Binabalikan mo ang naitalang hakbang. Bumalik sa unang hindi pa tapos upang magpatuloy.')
   : needsGuide&&state.viewStep<3
    ? [label('Open Prepare first.','Buksan muna ang Ihanda.'),label('Next, show the BHW presentation.','Susunod, buksan ang Ipakita sa BHW.'),label('Return to Prepare before choosing an answer.','Bumalik sa Ihanda bago pumili ng sagot.')][state.viewStep]
    : needsEvidence&&(!evidenceReady||evidenceChanged)
     ? label('Select all three observed facts, write your fictional note, then save the evidence before choosing an answer. You may save a partial note to continue later.','Piliin ang tatlong nasaksihang pangyayari, isulat ang kathang-isip na tala, saka i-save bago pumili ng sagot. Maaari ring i-save ang hindi pa kumpletong tala at balikan ito.')
     : label('Read the situation and choose an answer below. After the checkpoint is recorded, use Next checkpoint.','Basahin ang sitwasyon at pumili ng sagot sa ibaba. Kapag naitala na ang hakbang, piliin ang Susunod na checkpoint.');
 const button='min-h-11 rounded border border-primary-text px-4 py-2 text-primary-text disabled:opacity-50';
 async function request(action?:SimulationAction) {
  if(pending.current)return;
  pending.current=true;setBusy(true);setError(false);
  try {
   const {data,error:failure}=await createClient().rpc(action?'rpc_assessor_simulation_act':'rpc_assessor_simulation_state',{
    p_program_id:state.programInstanceId,...(action?{p_actor_id:state.actorId,p_version:state.version,
    p_requirements:state.requirementsVersion,p_chapter:state.chapterKey,p_scenario:state.scenarioId,
    p_revision:state.revision,p_checkpoint:storyScenes[state.next]?.id??'debrief',p_checkpoint_version:1,
    p_request_id:crypto.randomUUID(),p_action:action}:{})});
   const result=failure?null:parseSimulationState(data,state.programInstanceId,state.actorId);
   if(!result)throw new Error('unconfirmed');
   setState(result);
   if(action?.type==='choice')setFeedback(current.choices.find(c=>c.id===action.value)?.explanation??null);
   if(action?.type==='replay'){setIndex(0);setFacts([]);setNote('');setFeedback(null);requestAnimationFrame(()=>heading.current?.focus());}
   // Status recovery never discards unsaved local evidence.
  } catch {setError(true);} finally {pending.current=false;setBusy(false);}
 }
 function navigate(next:number){setIndex(next);setHint(false);setFeedback(null);requestAnimationFrame(()=>heading.current?.focus());}
 return <article className="mx-auto max-w-4xl space-y-6 px-4 py-10" lang={locale}>
  <h1 className="text-2xl font-semibold">{label('Maria’s platform simulation','Simulation sa platform ni Maria')}</h1>
  <p>{label('Fictional practice only. Confirmed checkpoints are saved to your own progress; no learner record or notification is created. Save your note before leaving. Use fictional information only. This receipt is not certification or authority.','Kathang-isip na pagsasanay lamang. Ang nakumpirmang mga hakbang ay naka-save sa sarili mong progreso; walang tala o abiso para sa tunay na BHW na ginagawa. I-save ang tala bago umalis. Kathang-isip na impormasyon lamang ang gamitin. Hindi sertipikasyon o pahintulot ang tala ng pagkumpleto.')}</p>
  <details><summary className="min-h-11 cursor-pointer py-2 underline">{label('About this practice','Tungkol sa pagsasanay na ito')}</summary><p>{label('Story approved for rehearsal. Criterion mapping, component sufficiency, evidence reuse and issuer approval remain unresolved.','Aprubado ang kuwento para sa pagsasanay. Hindi pa aprubado ang criterion mapping, sapat na ebidensya ng component, muling paggamit ng ebidensya at issuer.')}</p></details>
  <div role="group" aria-label={label('Language','Wika')}><button className={button} aria-pressed={locale==='en'} onClick={()=>setLocale('en')}>English</button> <button className={button} aria-pressed={locale==='fil'} onClick={()=>setLocale('fil')}>Filipino</button></div>
  <p>{label('Hints and retries are unlimited and unpenalized. Later scenes offer guidance on request. Save your note before pausing.','Walang limitasyon o parusa ang hints at retries. Makikita ang gabay sa mga huling scene kapag hiniling. I-save ang tala bago huminto.')}</p>
  {error&&<p role="alert">{label('Save/status could not be confirmed. Your edits are retained. Check saved status before retrying; the request may already have succeeded.','Hindi makumpirma ang save/status. Nananatili ang mga pagbabago. Tingnan ang na-save na status bago ulitin; maaaring matagumpay na ang request.')}</p>}
  <button className={button} disabled={busy} onClick={()=>void request()}>{label('Check saved status','Tingnan ang na-save na status')}</button>
  <section aria-labelledby="simulation-next-step" className="space-y-3 rounded-xl border border-primary/30 bg-canvas p-4">
   <h2 id="simulation-next-step" className="text-lg font-semibold">{label('Where you are and what to do next','Nasaan ka na at ano ang susunod')}</h2>
   <p>{label(`${state.next} of 11 checkpoints recorded.`,`${state.next} sa 11 hakbang ang naitala.`)}</p>
   <p aria-live="polite">{busy?label('Confirming saved progress… Wait before continuing.','Kinukumpirma ang na-save na progreso… Maghintay bago magpatuloy.'):error?label('The latest save or status is unconfirmed. Use Check saved status before trying again.','Hindi pa kumpirmado ang huling pag-save o pagbasa ng katayuan. Piliin ang Tingnan ang na-save na status bago subukang muli.'):nextInstruction}</p>
   {!editable&&state.next<11&&<button className={button} disabled={busy} onClick={()=>navigate(state.next)}>{label('Return to unfinished checkpoint','Bumalik sa hindi pa tapos na hakbang')}</button>}
   {state.next===11&&!state.receipt&&<a href="#runner-debrief" className="inline-flex min-h-11 items-center underline">{label('Go to completion step','Pumunta sa pagtatala ng pagkumpleto')}</a>}
  </section>
  <nav aria-label={label('Checkpoints','Mga checkpoint')} className="flex flex-wrap gap-2">{storyScenes.map((s,i)=><button className={button} key={s.id} disabled={busy||i>state.next} aria-current={i===index?'step':undefined} onClick={()=>navigate(i)}>{i+1}. {text(s.title)}{i<state.next?' ✓':''}</button>)}</nav>
  <section className="space-y-4" aria-labelledby="runner-scene">
   <h2 id="runner-scene" ref={heading} tabIndex={-1} className="text-xl font-semibold">{index+1}. {text(current.title)}</h2>
   <p>{label('Practice screen: follow the steps below using the fictional situation. No real learner record is opened here.','Pahina ng pagsasanay: sundin ang mga hakbang sa ibaba gamit ang kathang-isip na sitwasyon. Walang tunay na tala ng BHW na binubuksan dito.')}</p>
   <aside className="rounded-xl border border-primary/30 bg-primary/5 p-4" aria-label={label('Current working flow','Kasalukuyang working flow')}>
    <h3 className="font-semibold">{text(parity.surface)}</h3>
    <p className="mt-2 text-sm">{text(parity.state)}</p>
    <p className="mt-2 text-sm"><strong>{label('Controls and fields:','Mga control at field:')}</strong> {parity.actions.map(action=>text(action)).join(' → ')}</p>
   </aside>
   <p>{text(current.evidence)}</p>
   {needsGuide&&<section aria-label={label('Preparation views','Mga preparation view')}>
    <h3 className="font-semibold">{label('Before answering: open Prepare → show the BHW presentation → return to Prepare','Bago sumagot: buksan ang Ihanda → Ipakita sa BHW → bumalik sa Ihanda')}</h3>
    <button className={button} disabled={busy||!editable||state.viewStep===2||state.viewStep===3} onClick={()=>void request({type:'view',value:'guide'})}>{label('Open Prepare','Buksan ang Ihanda')}</button>
    <button className={button} disabled={busy||!editable||state.viewStep!==1} onClick={()=>void request({type:'view',value:'learner'})}>{text(chapter1Terms.bhwView)}</button>
    <button className={button} disabled={busy||!editable||state.viewStep!==2} onClick={()=>void request({type:'view',value:'return'})}>{label('Back to Prepare','Bumalik sa Ihanda')}</button>
    {guide==='guide'&&<p>{text(preparation.guide)}</p>}{guide==='learner'&&<p>{text(preparation.learner)}</p>}
   </section>}
      {(needsGuide && guide === 'guide' || needsEvidence || current.id === 'formal') && <section aria-label={label('Source lesson criterion', 'Source criterion ng aralin')}>
        <h3>{label('1.6.2 source lesson criterion — rehearsal only', 'Source criterion ng aralin 1.6.2 — pagsasanay lamang')}</h3>
        <p>{rubric[`observable_${locale}`]}</p>
        <dl>{(['kaya_na', 'kailangan_practice', 'hindi_pa'] as const).map(level => <div key={level}>
          <dt>{level === 'kaya_na' ? 'Kaya na' : level === 'kailangan_practice' ? 'Kailangan practice' : 'Hindi pa'}</dt>
          <dd>{rubric.levels[`${level}_${locale}`]}</dd>
        </div>)}</dl>
        <p className="wrap-anywhere">{label('Provenance: communication-clarify/competency.json, local indicator 0; not legacy module indicator 0. Component mapping is unapproved.', 'Pinagmulan: communication-clarify/competency.json, local indicator 0; hindi legacy module indicator 0. Hindi aprubado ang component mapping.')}</p>
      </section>}
      {needsEvidence && <fieldset disabled={busy||!editable}>
        <legend>{label('Select the observed facts, including the prompt', 'Piliin ang nasaksihang katotohanan, kasama ang prompt')}</legend>
        <p className="mb-3">{label('First select the facts. Then write and save your note. Answer the question only after saving. A prompt means someone gave a reminder or help.','Piliin muna ang mga pangyayari. Pagkatapos, isulat at i-save ang tala bago sagutin ang tanong. Ang prompt ay paalala o tulong na ibinigay habang ginagawa ang hakbang.')}</p>
        {practiceFacts.map((fact, i) => <label className="flex min-h-11 items-start gap-3 py-2" key={i}><input type="checkbox" checked={facts.includes(i)} onChange={event => setFacts(previous => event.target.checked ? [...previous, i] : previous.filter(value => value !== i))} />{text(fact)}</label>)}
        <label htmlFor="private-story-note">{label('Fictional observed facts note — no real learner details', 'Kathang-isip na tala ng nasaksihan — walang tunay na detalye ng BHW')}</label>
        <textarea className="block min-h-28 w-full rounded border border-ink/30 p-3" id="private-story-note" maxLength={1200} value={note} onChange={event => setNote(event.target.value)} />
        <p className="mt-2 text-sm" aria-live="polite">{busy?label('Confirming save…','Kinukumpirma ang pag-save…'):error?label('Save not confirmed. Your edits remain on this page.','Hindi kumpirmado ang pag-save. Nananatili ang binago mo sa pahinang ito.'):evidenceChanged?label('Changes not saved. Save before leaving or answering.','Hindi pa naka-save ang mga pagbabago. I-save bago umalis o sumagot.'):state.note||state.facts.length?label('Your note and selected facts match the saved record.','Tugma sa naka-save na tala ang iyong isinulat at piniling pangyayari.'):label('No evidence saved yet.','Wala pang naka-save na ebidensya.')}</p>
        <details><summary>{label('Compare with a model note', 'Ihambing sa modelong tala')}</summary><p>{text(modelNote)}</p></details>
        <p>{label('The check requires selected facts and a nonempty note; it does not judge the meaning or quality of your writing. Compare your note with the model.', 'Kailangan sa check ang napiling katotohanan at talang may laman; hindi nito hinuhusgahan ang kahulugan o kalidad ng iyong sulat. Ihambing ang tala sa modelo.')}</p>
      </fieldset>}
      {(current.id === 'chapter-gap' || current.id === 'final-review') && <section aria-label={label('Fictional chapter record', 'Kathang-isip na chapter record')}>
        <h3>{current.id === 'chapter-gap' ? label('Incomplete SAMPLE record', 'Hindi kumpletong SAMPLE record') : label('Separate complete SAMPLE record', 'Hiwalay na kumpletong SAMPLE record')}</h3>
        <ul>{chapterComponents.map((component, i) => <li key={component.en}>{text(component)}: {i === 8 && current.id === 'chapter-gap' ? label('Missing evidence — no grade', 'Kulang ang ebidensya — walang marka') : label('Assumed satisfied in this fixture only', 'Ipinagpapalagay na sapat sa fixture na ito lamang')}</li>)}</ul>
        <p>{label('Learner prerequisites, compatible versions and current assessor permission: assumed satisfied in this record only. No staff post-test threshold is imposed on Maria.', 'Learner prerequisites, compatible versions at kasalukuyang pahintulot ng assessor: ipinagpapalagay na sapat sa rekord na ito lamang. Walang staff post-test threshold na ipinapataw kay Maria.')}</p>
      </section>}

   {needsEvidence&&<button className={button} disabled={busy||!editable} onClick={()=>void request({type:'evidence',facts,note})}>{label('Save evidence / pause','I-save ang ebidensya / huminto')}</button>}
   <fieldset disabled={busy||!editable||choiceBlocked}><legend>{text(current.question)}</legend><div className="flex flex-col gap-3">{current.choices.map(c=><button className={button} key={c.id} onClick={()=>void request({type:'choice',value:c.id})}>{text(c.text)}</button>)}</div></fieldset>
   <button className={button} aria-expanded={hint} onClick={()=>setHint(!hint)}>{label('Show / hide hint','Ipakita / itago ang hint')}</button>
   {(hint||index<2)&&<p>{text(current.hint)}</p>}
   <p role="status">{feedback&&text(feedback)}</p>
   {index<10&&<button className={button} disabled={busy||index>=state.next} onClick={()=>navigate(index+1)}>{label('Next checkpoint','Susunod na checkpoint')}</button>}
  </section>
  <section className="space-y-3" aria-labelledby="runner-debrief">
   <h2 id="runner-debrief" tabIndex={-1} className="text-xl font-semibold">{label('Debrief and saved checkpoints','Debrief at mga naka-save na checkpoint')} · {state.next}/11</h2>
   <ol>{storyScenes.map((s,i)=><li key={s.id}>{text(s.title)} — {i<state.next?label('Recorded','Naitala'):label('Remaining','Kailangan pang tapusin')}
    {(state.attempts[s.id]??[]).length>0&&<details><summary>{label('Choices and corrections','Mga pinili at pagwawasto')}</summary><ol>{state.attempts[s.id].map((id,j)=>{const c=s.choices.find(c=>c.id===id);return <li key={j}>{c&&text(c.text)} — {c&&text(c.explanation)}</li>;})}</ol></details>}
   </li>)}</ol>
   {state.next===11&&<p>{label('The complete chapter record is a separate SAMPLE for fictional Maria. It has no verification identity, QR or signature. A lesson pass alone never completes a component or chapter.','Hiwalay na SAMPLE para sa kathang-isip na Maria ang kumpletong chapter record. Wala itong verification identity, QR o lagda. Hindi sapat ang isang lesson pass para makumpleto ang component o kabanata.')}</p>}
   {state.next===11&&!state.receipt&&<button className={button} disabled={busy} onClick={()=>void request({type:'finish'})}>{label('Finish debrief and save completion receipt','Tapusin ang debrief at i-save ang completion receipt')}</button>}
   {state.receipt&&<p role="status">{label('Personal familiarization completion recorded. Revised certification remains unavailable. Existing qualifications and their status are unchanged.','Naitala ang pagkumpleto ng sariling pagsasanay. Hindi pa available ang revised certification. Hindi nagbabago ang umiiral na kwalipikasyon at katayuan nito.')} {state.receipt.completedAt}</p>}
   {state.next===11&&state.receipt&&<button className={button} disabled={busy} onClick={()=>void request({type:'replay'})}>{label('Replay without resetting completion','Ulitin nang hindi binubura ang completion')}</button>}
   <Link prefetch={false} href={chapterHref} className="block underline">{label('Return to my preparation and current next step','Bumalik sa aking paghahanda at kasalukuyang susunod na hakbang')}</Link>
   {state.receipt&&<Link prefetch={false} href={workspaceHref} className="block underline">{label('Open the real Chapter 1 working area — current authority will be checked','Buksan ang tunay na working area ng Kabanata 1 — susuriin ang kasalukuyang awtoridad')}</Link>}
  </section>
 </article>;
}

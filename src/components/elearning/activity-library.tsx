"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { activityPlan, type ActivityRun, type ActivityText, type FacilitatorActivity } from "@/lib/elearning/activities";

type Lang = "fil" | "en";
const button = "min-h-[44px] rounded-md border border-ink/20 px-4 py-2 text-sm font-medium disabled:opacity-50";
const statusText: Record<ActivityRun["status"], ActivityText> = {
  planned: {en:"Planned",fil:"Nakaplano"}, run: {en:"Run",fil:"Nagawa"},
  adapted: {en:"Adapted",fil:"Inangkop"}, skipped: {en:"Skipped",fil:"Nilaktawan"},
};
const kindText: Record<FacilitatorActivity["kind"], ActivityText> = {
  discussion:{en:"Discussion",fil:"Talakayan"}, game:{en:"Game",fil:"Laro"},
  "role-play":{en:"Role-play",fil:"Pagsasadula"}, demonstration:{en:"Demonstration",fil:"Demonstration"},
  practical:{en:"Practical task",fil:"Praktikal na gawain"},
};

function ActivityRunner({ activity:a, lang, close }: {activity:FacilitatorActivity;lang:Lang;close:()=>void}) {
  const ref = useRef<HTMLDialogElement>(null);
  const text = (en:string,fil:string) => lang === "en" ? en : fil;
  useEffect(() => { const dialog=ref.current; dialog?.showModal(); return () => dialog?.close(); },[]);
  const list = (heading:string, values:ActivityText[], ordered=false) => <section className="mt-5 break-inside-avoid">
    <h3 className="font-semibold">{heading}</h3>
    {ordered ? <ol className="mt-2 list-decimal space-y-3 pl-6">{values.map((v,i)=><li key={i}>{v[lang]}</li>)}</ol> :
      <ul className="mt-2 list-disc space-y-2 pl-6">{values.map((v,i)=><li key={i}>{v[lang]}</li>)}</ul>}
  </section>;
  return createPortal(<dialog ref={ref} onCancel={close} onClose={close} aria-labelledby="activity-run-title"
    className="activity-runner fixed inset-0 m-auto max-h-[92dvh] w-[min(94vw,52rem)] overflow-y-auto rounded-xl border border-ink/20 bg-canvas p-5 text-ink shadow-xl backdrop:bg-black/50 sm:p-8">
    <div className="flex flex-wrap justify-between gap-3 print:hidden">
      <button autoFocus className={button} onClick={close}>{text("Close activity","Isara ang gawain")}</button>
      <button className={button} onClick={()=>window.print()}>{text("Print guide and worksheet","I-print ang gabay at worksheet")}</button>
    </div>
    <h2 id="activity-run-title" className="mt-4 text-2xl font-semibold">{a.title[lang]}</h2>
    <p className="mt-2">{a.purpose[lang]}</p>
    <p className="mt-2 text-sm">{a.minutes} {text("minutes (suggested)","minuto (mungkahi)")} · {a.group_size[lang]}</p>
    {list(text("Prepare","Ihanda"),a.materials)}
    {list(text("Run the activity","Patakbuhin ang gawain"),a.steps,true)}
    {list(text("Debrief","Talakayin pagkatapos"),a.debrief)}
    {list(text("What to observe","Ano ang oobserbahan"),a.observe)}
    <p className="mt-4"><strong>{text("Evidence: ","Ebidensiya: ")}</strong>{a.output[lang]}</p>
    <p className="mt-4"><strong>{text("Alternative: ","Alternatibo: ")}</strong>{a.alternative[lang]}</p>
    <section className="mt-6 break-inside-avoid border-t border-ink/20 pt-4">
      <h3 className="font-semibold">{text("Practice worksheet — fictional details only","Practice worksheet — kathang detalye lamang")}</h3>
      {a.worksheet.map((v,i)=><div key={i} className="mt-3"><p>{v[lang]}</p><div className="h-20 border-b border-ink/30"/></div>)}
    </section>
    <p className="mt-5 text-xs">{text("Adapted from source PDF pages","Inangkop mula sa source PDF pages")} {a.source_pages.join(", ")}. {text("Steps, timing and worksheet are facilitation adaptations.","Inangkop para sa facilitation ang hakbang, oras at worksheet.")} v{a.version}.</p>
    <style>{`@media print { body { display: block !important; min-height: 0 !important; height: auto !important; } body > *:not(.activity-runner) { display: none !important; } .activity-runner { position: static !important; display: block !important; width: 100% !important; max-width: none !important; max-height: none !important; height: auto !important; overflow: visible !important; border: 0 !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; } .activity-runner::backdrop { display: none; } }`}</style>
  </dialog>,document.body);
}

function RunEditor({a,run,lang,disabled,save}: {a:FacilitatorActivity;run?:ActivityRun;lang:Lang;disabled:boolean;save:(status:ActivityRun["status"],minutes:number|null,note:string)=>Promise<void>}) {
  const text=(en:string,fil:string)=>lang==="en"?en:fil;
  const [status,setStatus]=useState<ActivityRun["status"]>(run?.status??"planned");
  const [minutes,setMinutes]=useState(run?.duration_minutes?.toString()??"");
  const [note,setNote]=useState(run?.note??"");
  return <form className="mt-3 grid gap-3 rounded-md bg-ink/5 p-3" onSubmit={e=>{e.preventDefault();void save(status,minutes===""?null:Number(minutes),note);}}>
    <fieldset disabled={disabled} className="grid gap-3">
      <legend className="mb-2 font-medium">{text("Session record","Tala ng session")}: {a.title[lang]}</legend>
      <label className="grid gap-1">{text("Activity status","Status ng gawain")}
        <select className="min-h-[44px] rounded border bg-canvas p-2" value={status} onChange={e=>setStatus(e.target.value as ActivityRun["status"])}>
          {Object.entries(statusText).map(([k,v])=><option key={k} value={k}>{v[lang]}</option>)}
        </select>
      </label>
      <label className="grid gap-1">{text("Actual minutes (optional)","Aktwal na minuto (opsyonal)")}
        <input className="min-h-[44px] rounded border bg-canvas p-2" type="number" min="1" max="600" step="1" value={minutes} onChange={e=>setMinutes(e.target.value)}/>
      </label>
      <label className="grid gap-1">{text("Adaptation or follow-up note (no personal details)","Tala sa pag-angkop o follow-up (walang personal na detalye)")}
        <textarea className="rounded border bg-canvas p-2" rows={2} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/>
      </label>
      <button className={button} type="submit">{text("Save activity record","I-save ang tala ng gawain")}</button>
    </fieldset>
  </form>;
}

export function ActivityLibrary({activities,lang,sessionId,moduleId,moduleTitle,sessionOpen=true,initialRuns=[]}: {
  activities:FacilitatorActivity[];lang:Lang;sessionId?:string;moduleId?:string;moduleTitle?:string;sessionOpen?:boolean;initialRuns?:ActivityRun[];
}) {
  const [runs,setRuns]=useState(initialRuns);
  const [selected,setSelected]=useState<string[]>(initialRuns.filter(r=>r.status!=="skipped").map(r=>r.activity_id));
  const [active,setActive]=useState<FacilitatorActivity|null>(null);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  const [saved,setSaved]=useState("");
  const text=(en:string,fil:string)=>lang==="en"?en:fil;
  const plan=activityPlan(activities,selected,lang);
  if(!activities.length && !runs.length)return null;
  const available=[...activities,...runs.filter(r=>!activities.some(a=>a.id===r.activity_id)).map(r=>r.activity_snapshot)];
  async function save(a:FacilitatorActivity,status:ActivityRun["status"],minutes:number|null,note:string) {
    if(!sessionId||!moduleId||!sessionOpen)return;
    setPending(true);setError("");setSaved("");
    try {
      const {data,error:rpcError}=await createClient().rpc("rpc_course_session_activity_record",{
        p_session_id:sessionId,p_module_id:moduleId,p_activity_id:a.id,p_activity_version:a.version,p_status:status,p_duration_minutes:minutes,p_note:note,
      });
      if(rpcError)throw new Error(rpcError.message);
      const entry:ActivityRun={id:String(data),session_id:sessionId,module_id:moduleId,activity_id:a.id,status,duration_minutes:minutes,note:note.trim(),activity_snapshot:a,recorded_at:new Date().toISOString()};
      setRuns(prev=>[...prev.filter(r=>r.activity_id!==a.id),entry]);
      setSelected(prev=>status==="skipped"?prev.filter(id=>id!==a.id):[...new Set([...prev,a.id])]);
      setSaved(text("Activity record saved.","Nai-save ang tala ng gawain."));
    } catch {setError(text("Could not save. Check that the session is open and refresh if the activity changed. Your entries remain available.","Hindi na-save. Tiyaking bukas ang session at i-refresh kung nagbago ang gawain. Nananatili ang iyong isinulat."));}
    finally {setPending(false);}
  }
  return <section className="space-y-4 rounded-xl border border-secondary/30 p-4" aria-label={text("Activities you can run","Mga gawaing maaari mong gawin")}>
    <h2 className="text-lg font-semibold">{text("Activities you can run","Mga gawaing maaari mong gawin")}</h2>
    {moduleTitle && <p className="font-medium">{moduleTitle}</p>}
    <p className="text-sm">{text("Choose activities to suit the group. Participation is not a competency rating. Timing is suggested, not added required training hours.","Pumili ayon sa pangkat. Hindi rating ng kakayahan ang pagsali. Mungkahing oras ito, hindi dagdag na required training hours.")}</p>
    {!!selected.length && <div className="rounded-md bg-secondary/5 p-3 text-sm">
      <p className="font-medium">{text("Selected activities","Napiling gawain")}: {plan.minutes} {text("suggested minutes","mungkahing minuto")}</p>
      <ul className="mt-2 list-disc pl-5">{plan.materials.map(m=><li key={m}>{m}</li>)}</ul>
      {!!plan.alternatives.length && <p className="mt-2">{text("You selected alternative games; normally choose one.","Napili ang mga alternatibong laro; karaniwang isa lamang ang piliin.")}</p>}
      {!sessionId && <p className="mt-2">{text("This selection is for this view only. Save a session plan from Training sessions.","Para sa view na ito lamang ang pagpili. Mag-save ng plano sa Training sessions.")}</p>}
    </div>}
    {error&&<p role="alert" className="text-danger">{error}</p>}{saved&&<p role="status" className="text-success">{saved}</p>}
    <ul className="space-y-3">{available.map(a=>{
      const run=runs.find(r=>r.activity_id===a.id);
      return <li key={a.id} className="rounded-md border border-ink/15 p-4">
        <h3 className="font-semibold">{a.title[lang]}</h3>
        <p className="mt-1 text-xs">{text("Suggested","Mungkahi")} · {kindText[a.kind][lang]} · {a.minutes} {text("min","minuto")}{a.choice_group&&` · ${text("Choose one game","Pumili ng isang laro")}`}</p>
        <p className="mt-2">{a.purpose[lang]}</p>
        <p className="mt-2 text-sm">{a.objective_indices.length?text(`Suitable for observing subchapter indicators ${a.objective_indices.map(i=>i+1).join(", ")}.`,`Maaaring gamitin sa pag-obserba ng subchapter indicators ${a.objective_indices.map(i=>i+1).join(", ")}.`):text("Facilitation and practice only.","Para sa facilitation at pagsasanay lamang.")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={button} onClick={()=>setActive(a)}>{text("Run activity","Buksan ang gawain")}</button>
          {run && <button className={button} onClick={()=>setActive(run.activity_snapshot)}>{text("View recorded version","Tingnan ang naitalang bersiyon")}</button>}
          <button className={button} aria-pressed={selected.includes(a.id)} disabled={pending||!!sessionId&&!sessionOpen}
            onClick={()=>sessionId?void save(a,selected.includes(a.id)?"skipped":"planned",run?.duration_minutes??null,run?.note??""):setSelected(prev=>prev.includes(a.id)?prev.filter(id=>id!==a.id):[...prev,a.id])}>
            {selected.includes(a.id)?text(sessionId?"Skip activity":"Remove from selection",sessionId?"Laktawan ang gawain":"Alisin sa pagpili"):text(sessionId?"Add to session plan":"Select activity",sessionId?"Idagdag sa plano":"Piliin ang gawain")}
          </button>
          {run&&<span className="self-center text-sm">{statusText[run.status][lang]}{run.duration_minutes?` · ${run.duration_minutes} min`:""}</span>}
        </div>
        {sessionId&&(selected.includes(a.id)||run)&&<RunEditor key={`${a.id}-${run?.recorded_at??"new"}`} a={a} run={run} lang={lang} disabled={pending||!sessionOpen} save={(s,m,n)=>save(a,s,m,n)}/>}
      </li>;
    })}</ul>
    {active&&<ActivityRunner activity={active} lang={lang} close={()=>setActive(null)}/>}
  </section>;
}

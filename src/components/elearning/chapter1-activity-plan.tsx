"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FacilitatorActivity, ActivityRun } from "@/lib/elearning/activities";

type Option = {id:string; status:string; scheduled_at:string|null};
export function Chapter1ActivityPlan({lang,lessonId,activities,sessions,guideHref}: {
  lang:"fil"|"en";lessonId:string;activities:FacilitatorActivity[];sessions:Option[];guideHref:string;
}) {
  const pick=(fil:string,en:string)=>lang==="en"?en:fil;
  const [options,setOptions]=useState(sessions);
  const [sessionId,setSessionId]=useState("");
  const [runs,setRuns]=useState<ActivityRun[]>([]);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  async function choose(id:string,clear=true) {
    if(clear){setError("");setMessage("");}setSessionId(id);
    if(!id){setRuns([]);return;}
    const {data,error:e}=await createClient().from("course_session_activities")
      .select("id,session_id,module_id,activity_id,status,duration_minutes,note,activity_snapshot,recorded_at")
      .eq("session_id",id).limit(100).returns<ActivityRun[]>();
    if(e){setError(pick("Hindi mabasa ang plano.","Could not load the plan."));return;}
    setRuns(data??[]);
  }
  async function create() {
    if(pending)return;
    setPending(true);setError("");setMessage("");
    const {data,error:e}=await createClient().rpc("rpc_course_lesson_plan_create",{p_lesson_id:lessonId});
    if(e || !data){setError(pick("Hindi magawa ang draft plan.","Could not create the draft plan."));setPending(false);return;}
    const id=String(data);
    setOptions(prev=>prev.some(s=>s.id===id)?prev:[{id,status:"draft",scheduled_at:null},...prev]);
    await choose(id);
    setMessage(pick("Bukas ang draft plan. Wala pang BHW na nakatala o training na naihatid.","Draft plan opened. No BHW was enrolled and no training was delivered."));
    setPending(false);
  }
  async function save(a:FacilitatorActivity,replace=false) {
    if(!sessionId||pending)return;
    setPending(true);setError("");setMessage("");
    const {error:e}=await createClient().rpc("rpc_course_lesson_plan_activity_save",{
      p_session_id:sessionId,p_lesson_id:lessonId,p_activity_id:a.id,p_activity_version:a.version,p_replace:replace,
    });
    if(e)setError(pick("Hindi na-save. Maaaring nagbago ang gawain o sarado ang session. I-refresh ang pahina.","Could not save. The activity may have changed or the session may be closed. Refresh the page."));
    else {await choose(sessionId,false);setMessage(pick("Nai-save ang plano; hindi ito tala ng pagsasanay.","Plan saved; this is not a delivery record."));}
    setPending(false);
  }
  const current=options.find(s=>s.id===sessionId);
  return <section className="rounded-xl border border-primary/30 p-4 sm:p-5 space-y-3" aria-label={pick("Plano ng gawain","Activity plan")}>
    <h2 className="font-semibold">{pick("Plano ng gawain para sa 1.6.2","Activity plan for 1.6.2")}</h2>
    <p className="text-sm">{pick("Pumili ng sariling bukas na session o gumawa ng draft. Ang pag-save ay plano lamang: walang attendance, delivery, o marka.","Choose your own open session or create a draft. Saving only plans activities: no attendance, delivery, or grade is recorded.")}</p>
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid min-w-48 flex-1 gap-1">{pick("Session","Session")}
        <select className="min-h-11 rounded border bg-canvas p-2" value={sessionId} onChange={e=>void choose(e.target.value)}>
          <option value="">{pick("Pumili ng session","Choose a session")}</option>
          {options.map(s=><option key={s.id} value={s.id}>{s.status==="draft"?pick("Draft plan","Draft plan"):s.scheduled_at?new Date(s.scheduled_at).toLocaleString(lang==="en"?"en-PH":"fil-PH"):"Session"} · {s.id.slice(0,8)}</option>)}
        </select>
      </label>
      <button className="min-h-11 rounded border px-4 disabled:opacity-50" disabled={pending} onClick={()=>void create()}>{pick("Gumawa o buksan ang draft","Create or open draft")}</button>
    </div>
    {current&&<Link prefetch={false} className="inline-block min-h-11 content-center underline" href={`/training-sessions/${current.id}?returnTo=${encodeURIComponent(guideHref)}`}>{pick("Pumunta sa session →","Go to session →")}</Link>}
    {error&&<p role="alert" className="text-danger">{error}</p>}{message&&<p role="status" className="text-success">{message}</p>}
    <ul className="grid gap-2 sm:grid-cols-2">{activities.map(a=>{
      const saved=runs.find(r=>r.activity_id===a.id);
      return <li className="rounded border p-3" key={a.id}>
        <h3 className="font-medium">{saved?.activity_snapshot.title[lang]??a.title[lang]}</h3>
        <p className="text-sm">{saved?pick(`Naitalang ${saved.status} · bersiyon ${saved.activity_snapshot.version}`,`Recorded as ${saved.status} · version ${saved.activity_snapshot.version}`):pick(`Kasalukuyang bersiyon ${a.version}`,`Current version ${a.version}`)}</p>
        {saved?.status==='planned'&&saved.activity_snapshot.version!==a.version
          ?<button className="mt-2 min-h-11 rounded border px-3 disabled:opacity-50" disabled={!sessionId||pending} onClick={()=>void save(a,true)}>{pick(`Palitan ng bersiyon ${a.version}`,`Replace with version ${a.version}`)}</button>
          :<button className="mt-2 min-h-11 rounded border px-3 disabled:opacity-50" disabled={!sessionId||pending||!!saved} onClick={()=>void save(a)}>{saved?pick("Naitala na","Already recorded"):pick("I-save sa plano","Save to plan")}</button>}
      </li>;
    })}</ul>
    <p className="text-sm">{pick("Para sa indibidwal na pagsasanay, buksan ang gawain sa buong gabay. Ang lokal na pagpili ay hindi sine-save.","For individual practice, open an activity in the complete guide. Local selections are not saved.")}</p>
  </section>;
}

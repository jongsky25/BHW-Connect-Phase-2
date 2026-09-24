"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  latestObservations,
  OBSERVATION_LEVELS,
  OBSERVATION_LEVEL_LABELS,
  type CompetencyObservation,
  type ObservationLevel,
} from "@/lib/elearning/facilitator-guide";
import { createClient } from "@/lib/supabase/client";

// Every BHW in the facilitator's area for one subchapter: lesson progress,
// test status, and the current competency rating per indicator, with a form
// to record a new observation (rpc_competency_observation_record). Ratings
// are append-only; recording again adds a newer rating.

type Lang = "fil" | "en";
const pick = (lang: Lang, fil: string, en: string) => (lang === "en" ? en : fil);

export type RosterRow = {
  id: string;
  name: string;
  unit: string | null;
  lessonsDone: number;
  pretest: number | null;
  posttest: number | null;
  certified: boolean;
};

export type RosterIndicator = {
  objective_index: number;
  observable: string;
  levels: Record<ObservationLevel, string>;
};

const LEVEL_TONE: Record<ObservationLevel, string> = {
  kaya_na: "bg-success/15 text-ink",
  kailangan_practice: "bg-celebration/50 text-ink",
  hindi_pa: "bg-danger/15 text-ink",
};

function errorText(lang: Lang, message: string) {
  if (/not authorized/.test(message)) return pick(lang, "Wala kang pahintulot na magtala para sa BHW na ito.", "You are not allowed to record for this BHW.");
  if (/indicator not found/.test(message)) return pick(lang, "Hindi na makita ang indicator. I-refresh ang pahina.", "That indicator no longer exists. Refresh the page.");
  if (/note too long/.test(message)) return pick(lang, "Masyadong mahaba ang tala (hanggang 1000 titik).", "The note is too long (1000 characters maximum).");
  return pick(lang, "Hindi naitala. Subukang muli.", "Could not save. Please try again.");
}

export function FacilitatorRoster({
  lang,
  moduleId,
  rows,
  indicators,
  observations,
  lessonCount,
}: {
  lang: Lang;
  moduleId: string;
  rows: RosterRow[];
  indicators: RosterIndicator[];
  observations: CompetencyObservation[];
  lessonCount: number;
}) {
  const router = useRouter();
  const latest = latestObservations(observations);
  const [open, setOpen] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<number>(indicators[0]?.objective_index ?? 0);
  const [level, setLevel] = useState<ObservationLevel | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  if (!rows.length) {
    return <p className="text-sm text-ink/70">{pick(lang, "Walang aktibong BHW sa iyong lugar.", "No active BHWs in your area.")}</p>;
  }

  const summary = indicators.map((ind) => {
    const counts = { kaya_na: 0, kailangan_practice: 0, hindi_pa: 0, none: 0 };
    rows.forEach((r) => { const obs = latest.get(`${r.id}:${ind.objective_index}`); counts[obs?.level ?? "none"] += 1; });
    return { ind, counts };
  });

  // Follow-up: the latest rating below Kaya na, oldest first, then BHWs who
  // finished every lesson here but have never been observed.
  const followUp = rows.flatMap((r) =>
    indicators.flatMap((ind, i) => {
      const obs = latest.get(`${r.id}:${ind.objective_index}`);
      return obs && obs.level !== "kaya_na" ? [{ row: r, number: i + 1, index: ind.objective_index, obs }] : [];
    }),
  ).sort((a, b) => a.obs.observed_at.localeCompare(b.obs.observed_at));
  const ready = indicators.length && lessonCount
    ? rows.filter((r) => r.lessonsDone >= lessonCount && !indicators.some((ind) => latest.has(`${r.id}:${ind.objective_index}`)))
    : [];
  const daysAgo = (at: string) => Math.max(0, Math.floor((now - new Date(at).getTime()) / 86_400_000));

  function start(rowId: string, objectiveIndex?: number) {
    setOpen(open === rowId && objectiveIndex === undefined ? null : rowId);
    setIndicator(objectiveIndex ?? indicators[0]?.objective_index ?? 0);
    setLevel(null); setNote(""); setError(null); setSaved(null);
  }

  async function save(row: RosterRow) {
    if (!level) return;
    setSaving(true); setError(null);
    try {
      const { error: rpcError } = await createClient().rpc("rpc_competency_observation_record", {
        p_bhw_user_id: row.id,
        p_module_id: moduleId,
        p_objective_index: indicator,
        p_level: level,
        p_note: note,
      });
      if (rpcError) { setError(errorText(lang, rpcError.message)); return; }
      setSaved(row.name); setOpen(null);
      router.refresh();
    } catch {
      setError(errorText(lang, ""));
    } finally {
      setSaving(false);
    }
  }

  const current = indicators.find((i) => i.objective_index === indicator);

  return (
    <div className="flex flex-col gap-4">
      {summary.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {summary.map(({ ind, counts }, i) => (
            <div key={ind.objective_index} className="rounded-md border border-ink/10 p-3 text-sm">
              <p className="font-medium">{pick(lang, "Indicator", "Indicator")} {i + 1}</p>
              <p className="mt-1 text-ink/70">
                {OBSERVATION_LEVELS.map((l) => `${OBSERVATION_LEVEL_LABELS[l][lang].split(" (")[0]}: ${counts[l]}`).join(" · ")}
                {" · "}{pick(lang, "Wala pang obserbasyon", "Not observed")}: {counts.none}
              </p>
            </div>
          ))}
        </div>
      )}
      {(followUp.length > 0 || ready.length > 0) && (
        <div className="flex flex-col gap-3 rounded-md border border-celebration bg-celebration/20 p-4" aria-labelledby="follow-up-heading">
          <h3 id="follow-up-heading" className="font-semibold">{pick(lang, "Kailangang balikan", "Needs follow-up")}</h3>
          {followUp.length > 0 && (
            <ul className="flex flex-col gap-2 text-sm">
              {followUp.map(({ row, number, index, obs }) => (
                <li key={`${row.id}:${index}`} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium">{row.name}</span>
                    {` · ${pick(lang, "Ind.", "Ind.")} ${number}: ${OBSERVATION_LEVEL_LABELS[obs.level][lang].split(" (")[0]} · `}
                    {daysAgo(obs.observed_at) === 0 ? pick(lang, "ngayong araw", "today") : pick(lang, `${daysAgo(obs.observed_at)} araw na ang nakalipas`, `${daysAgo(obs.observed_at)} days ago`)}
                    {obs.note && <span className="block text-ink/70">{obs.note}</span>}
                  </span>
                  <button type="button" onClick={() => start(row.id, index)} className="min-h-[44px] rounded-md border border-ink/20 px-3 py-1 font-medium">
                    {pick(lang, "Obserbahan muli", "Re-observe")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {ready.length > 0 && (
            <p className="text-sm">
              <span className="font-medium">{pick(lang, "Tapos na sa mga aralin, hindi pa naoobserbahan: ", "Finished the lessons, not yet observed: ")}</span>
              {ready.map((r) => r.name).join(", ")}
            </p>
          )}
        </div>
      )}
      {saved && <p role="status" className="text-sm text-success">{pick(lang, `Naitala ang obserbasyon para kay ${saved}.`, `Observation recorded for ${saved}.`)}</p>}
      <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{row.name}</p>
                {row.unit && <p className="text-sm text-ink/60">{row.unit}</p>}
                <p className="mt-1 text-sm text-ink/80">
                  {pick(lang, `Aralin: ${row.lessonsDone}/${lessonCount}`, `Lessons: ${row.lessonsDone}/${lessonCount}`)}
                  {" · "}{pick(lang, "Pretest", "Pretest")}: {row.pretest === null ? "—" : `${row.pretest}%`}
                  {" · "}{pick(lang, "Posttest", "Posttest")}: {row.posttest === null ? "—" : `${row.posttest}%`}
                  {row.certified && ` · ${pick(lang, "Sertipikado", "Certified")}`}
                </p>
              </div>
              <button type="button" onClick={() => start(row.id)} aria-expanded={open === row.id}
                className="min-h-[44px] rounded-md border border-ink/20 px-4 py-2 text-sm font-medium">
                {open === row.id ? pick(lang, "Isara", "Close") : pick(lang, "Magtala ng obserbasyon", "Record observation")}
              </button>
            </div>
            {indicators.length > 0 && (
              <ul className="flex flex-wrap gap-2 text-xs" aria-label={pick(lang, "Kasalukuyang rating", "Current ratings")}>
                {indicators.map((ind, i) => {
                  const obs = latest.get(`${row.id}:${ind.objective_index}`);
                  return (
                    <li key={ind.objective_index} className={`rounded-full px-3 py-1 ${obs ? LEVEL_TONE[obs.level] : "bg-ink/5 text-ink/70"}`}
                      title={obs?.note || undefined}>
                      {pick(lang, "Ind.", "Ind.")} {i + 1}: {obs ? OBSERVATION_LEVEL_LABELS[obs.level][lang].split(" (")[0] : pick(lang, "wala pang obserbasyon", "not observed")}
                      {obs && ` · ${new Date(obs.observed_at).toLocaleDateString(lang === "en" ? "en-PH" : "fil-PH")}`}
                    </li>
                  );
                })}
              </ul>
            )}
            {open === row.id && (
              <form className="flex flex-col gap-3 rounded-md bg-ink/5 p-4" onSubmit={(e) => { e.preventDefault(); void save(row); }}>
                {indicators.length === 0 ? (
                  <p className="text-sm">{pick(lang, "Walang indicator na maitatala.", "There are no indicators to record.")}</p>
                ) : (
                  <>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      {pick(lang, "Indicator", "Indicator")}
                      <select className="min-h-[44px] rounded-md border border-ink/20 bg-canvas px-2" value={indicator}
                        onChange={(e) => { setIndicator(Number(e.target.value)); setLevel(null); }}>
                        {indicators.map((ind, i) => <option key={ind.objective_index} value={ind.objective_index}>{i + 1}. {ind.observable}</option>)}
                      </select>
                    </label>
                    <fieldset className="flex flex-col gap-2">
                      <legend className="text-sm font-medium">{pick(lang, "Antas", "Level")}</legend>
                      {OBSERVATION_LEVELS.map((l) => (
                        <label key={l} className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md p-3 ${LEVEL_TONE[l]}`}>
                          <input type="radio" name={`level-${row.id}`} value={l} checked={level === l} onChange={() => setLevel(l)} className="mt-1" />
                          <span>
                            <span className="font-medium">{OBSERVATION_LEVEL_LABELS[l][lang]}</span>
                            {current && <span className="block text-sm text-ink/80">{current.levels[l]}</span>}
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      {pick(lang, "Tala (opsyonal): ano ang nakita mo?", "Note (optional): what did you see?")}
                      <textarea className="rounded-md border border-ink/20 bg-canvas p-2" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
                    </label>
                    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
                    <button type="submit" disabled={!level || saving}
                      className="min-h-[44px] self-start rounded-md bg-primary px-6 py-2 font-medium text-on-primary disabled:opacity-50">
                      {saving ? pick(lang, "Itinatala…", "Saving…") : pick(lang, "Itala", "Save")}
                    </button>
                  </>
                )}
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

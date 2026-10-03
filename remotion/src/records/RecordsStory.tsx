import {
  AbsoluteFill,
  Audio,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { RECORDS_BEATS } from "./narration";

export const RECORDS_FPS = 30;
export const RECORDS_FALLBACK_DURATION = RECORDS_FPS * 60;
const TAIL_SECONDS = 1.2;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type RecordsStoryProps = {
  language: "fil" | "en" | "ceb" | "hil";
  beatFrames?: number[];
  audioSrc?: string;
};

type NarrationTimings = {
  language: string;
  durationSeconds: number;
  beats: { zone: string; start_ms: number; end_ms: number }[];
};

export const calculateRecordsMetadata: CalculateMetadataFunction<RecordsStoryProps> = async ({ props }) => {
  const response = await fetch(staticFile(`records/narration-${props.language}.json`)).catch(() => null);
  if (!response?.ok) return { durationInFrames: RECORDS_FALLBACK_DURATION, props };
  const timings: NarrationTimings = await response.json();
  if (timings.language !== props.language || timings.beats.length !== RECORDS_BEATS.length ||
      timings.beats.some((beat, index) => beat.zone !== RECORDS_BEATS[index].id))
    throw new Error("records narration timing does not match the authored beats");
  const boundaries = [
    ...timings.beats.map((beat) => beat.start_ms),
    timings.durationSeconds * 1000 + TAIL_SECONDS * 1000,
  ];
  const atFrame = (ms: number) => Math.round(ms * RECORDS_FPS / 1000);
  const beatFrames = boundaries.slice(1).map((ms, index) => atFrame(ms) - atFrame(boundaries[index]));
  if (beatFrames.some((frames) => frames < 1)) throw new Error("records narration has an empty beat");
  return {
    durationInFrames: beatFrames.reduce((sum, frames) => sum + frames, 0),
    props: { ...props, beatFrames, audioSrc: staticFile(`records/narration-${props.language}.mp3`) },
  };
};

const ink = "#173630";
const pale = "#eaf5ef";
const mint = "#82d5b0";
const white = "#fffdf7";

function Icon({ kind }: { kind: string }) {
  const common = { fill: "none", stroke: ink, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "household") return <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true"><path {...common} d="M14 43 50 15 86 43v42H14Z"/><path {...common} d="M39 84V55h22v29"/><circle cx="28" cy="52" r="4" fill={mint}/><circle cx="72" cy="52" r="4" fill={mint}/></svg>;
  if (kind === "master-list") return <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true"><circle {...common} cx="27" cy="29" r="11"/><circle {...common} cx="73" cy="29" r="11"/><circle {...common} cx="50" cy="43" r="12"/><path {...common} d="M9 77c0-13 9-22 20-22m62 22c0-13-9-22-20-22M27 87c0-18 10-29 23-29s23 11 23 29"/></svg>;
  if (kind === "registry") return <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true"><rect {...common} x="18" y="10" width="64" height="80" rx="5"/><path {...common} d="m29 33 6 6 9-12M52 34h19M29 59l6 6 9-12M52 60h19"/></svg>;
  return <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true"><rect {...common} x="12" y="15" width="52" height="70" rx="5"/><path {...common} d="M23 32h29M23 45h29M23 58h20M63 49h24m-9-9 9 9-9 9"/><circle cx="83" cy="73" r="9" fill={mint}/></svg>;
}

const kinds = ["household", "master-list", "registry", "assigned-form"];

function SummaryCards({ frame, language }: { frame: number; language: RecordsStoryProps["language"] }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, width: 760, marginTop: 26 }}>
    {kinds.map((kind, index) => {
      const beat = RECORDS_BEATS[index + 1];
      const opacity = interpolate(frame, [index * 7, index * 7 + 12], [0, 1], clamp);
      const y = interpolate(frame, [index * 7, index * 7 + 12], [20, 0], clamp);
      return <div key={kind} style={{ opacity, transform: `translateY(${y}px)`, background: white, borderRadius: 18, padding: "20px 12px", minHeight: 190, display: "flex", alignItems: "center", flexDirection: "column", boxShadow: "0 9px 24px #102c2440" }}>
        <Icon kind={kind}/>
        <div style={{ color: ink, fontWeight: 800, fontSize: 19, textAlign: "center", lineHeight: 1.15, marginTop: 9 }}>{language === "ceb" || language === "hil" ? beat[`title_${language}`] : beat.title_fil === beat.title_en ? beat.title_en : `${beat.title_fil} / ${beat.title_en}`}</div>
      </div>;
    })}
  </div>;
}

function BeatScene({ index, language }: { index: number; language: RecordsStoryProps["language"] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = RECORDS_BEATS[index];
  const enter = spring({ frame, fps, config: { damping: 200, stiffness: 115 } });
  const opacity = interpolate(frame, [0, 10], [0, 1], clamp);
  const float = Math.sin(frame / 15) * 3;
  const summary = beat.id === "summary";
  const intro = beat.id === "question";
  return <AbsoluteFill style={{ background: "linear-gradient(130deg, #0c4b3b 0%, #156451 55%, #25745a 100%)", fontFamily: "Arial, 'Noto Sans', sans-serif", overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 470, height: 470, right: -145, top: -190, borderRadius: "50%", background: "#8fe0b443" }}/>
    <div style={{ position: "absolute", width: 420, height: 420, left: -160, bottom: -290, borderRadius: "50%", background: "#a2dbbb30" }}/>
    <div style={{ position: "absolute", left: 42, top: 31, color: "#d8f2e3", fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>BHW CONNECT  ·  1.1.5</div>
    <div style={{ position: "absolute", right: 42, top: 29, display: "flex", gap: 5, alignItems: "end", height: 20 }} aria-hidden="true">
      {[0, 1, 2, 3].map((bar) => <div key={bar} style={{ width: 5, height: 7 + Math.abs(Math.sin(frame / 4 + bar)) * 13, borderRadius: 4, background: mint }}/>)
    }</div>
    {summary ? <div style={{ margin: "70px auto 0", width: 770, textAlign: "center", opacity }}>
      <h1 style={{ margin: 0, color: white, fontSize: 33, fontWeight: 800, lineHeight: 1.15 }}>{language === "ceb" || language === "hil" ? beat[`title_${language}`] : <>{beat.title_fil}<br/>{beat.title_en}</>}</h1>
      <SummaryCards frame={frame} language={language}/>
      <div style={{ color: pale, fontSize: 19, marginTop: 18 }}>{language === "ceb" || language === "hil" ? beat[`detail_${language}`] : `${beat.detail_fil} / ${beat.detail_en}`}</div>
    </div> : <>
      <div style={{ position: "absolute", left: 46, top: 136, width: 385, opacity, transform: `translateY(${(1 - enter) * 26}px)` }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: mint, marginBottom: 12 }}>{String(index + 1).padStart(2, "0")} / 06</div>
        <h1 style={{ margin: 0, fontSize: language === "ceb" || language === "hil" ? 37 : intro ? 43 : 42, lineHeight: 1.06, fontWeight: 800, color: white }}>{beat[`title_${language}`]}</h1>
        <p style={{ color: pale, fontSize: 25, lineHeight: 1.25, marginTop: 24 }}>{beat[`detail_${language}`]}</p>
      </div>
      <div style={{ position: "absolute", right: 48, top: 97, width: 335, height: 285, background: white, borderRadius: 24, boxShadow: "0 18px 40px #06251d85", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: enter, transform: `translateX(${(1 - enter) * 80}px) translateY(${float}px) rotate(${intro ? -3 : 0}deg)` }}>
        {intro ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 15, transform: "scale(.8)" }}>{kinds.map((kind) => <div key={kind} style={{ width: 100, height: 100, borderRadius: 15, display: "grid", placeItems: "center", background: pale }}><Icon kind={kind}/></div>)}</div> : <Icon kind={beat.id}/>}
        <div style={{ marginTop: 15, color: ink, fontSize: 18, fontWeight: 700, textAlign: "center" }}>{intro ? ({ fil: "Apat na uri ng tala", en: "Four record types", ceb: "Upat ka matang sa rekord", hil: "Apat ka klase sang rekord" }[language]) : beat[`title_${language}`]}</div>
      </div>
    </>}
    <div style={{ position: "absolute", bottom: 27, left: 42, display: "flex", gap: 8 }} aria-hidden="true">{RECORDS_BEATS.map((item, dot) => <div key={item.id} style={{ width: dot === index ? 28 : 9, height: 9, background: dot === index ? mint : "#a3ccb8", borderRadius: 10, opacity: dot === index ? 1 : .55 }}/>)}</div>
  </AbsoluteFill>;
}

export const RecordsStory: React.FC<RecordsStoryProps> = ({ language, beatFrames, audioSrc }) => {
  const durations = beatFrames ?? RECORDS_BEATS.map(() => RECORDS_FPS * 10);
  return <AbsoluteFill>
    {audioSrc && <Audio src={audioSrc}/>}
    <Series>
      {RECORDS_BEATS.map((beat, index) => <Series.Sequence key={beat.id} durationInFrames={durations[index]}><BeatScene index={index} language={language}/></Series.Sequence>)}
    </Series>
  </AbsoluteFill>;
};

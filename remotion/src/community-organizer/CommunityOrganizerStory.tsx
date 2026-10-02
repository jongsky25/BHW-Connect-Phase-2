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
import { COMMUNITY_ORGANIZER_BEATS } from "./narration";

export const COMMUNITY_ORGANIZER_FPS = 30;
export const COMMUNITY_ORGANIZER_FALLBACK_DURATION = COMMUNITY_ORGANIZER_FPS * 75;
const TAIL_SECONDS = 1.2;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type CommunityOrganizerStoryProps = {
  language: "fil" | "en";
  beatFrames?: number[];
  audioSrc?: string;
};

type NarrationTimings = {
  language: string;
  durationSeconds: number;
  beats: { zone: string; start_ms: number; end_ms: number }[];
};

export const calculateCommunityOrganizerMetadata: CalculateMetadataFunction<CommunityOrganizerStoryProps> = async ({ props }) => {
  const response = await fetch(staticFile(`community-organizer/narration-${props.language}.json`)).catch(() => null);
  if (!response?.ok) return { durationInFrames: COMMUNITY_ORGANIZER_FALLBACK_DURATION, props };
  const timings: NarrationTimings = await response.json();
  if (timings.language !== props.language || timings.beats.length !== COMMUNITY_ORGANIZER_BEATS.length ||
      timings.beats.some((beat, index) => beat.zone !== COMMUNITY_ORGANIZER_BEATS[index].id))
    throw new Error("community-organizer narration timing does not match the authored beats");
  const boundaries = [...timings.beats.map((beat) => beat.start_ms), timings.durationSeconds * 1000 + TAIL_SECONDS * 1000];
  const atFrame = (ms: number) => Math.round(ms * COMMUNITY_ORGANIZER_FPS / 1000);
  const beatFrames = boundaries.slice(1).map((ms, index) => atFrame(ms) - atFrame(boundaries[index]));
  if (beatFrames.some((frames) => frames < 1)) throw new Error("community-organizer narration has an empty beat");
  return {
    durationInFrames: beatFrames.reduce((sum, frames) => sum + frames, 0),
    props: { ...props, beatFrames, audioSrc: staticFile(`community-organizer/narration-${props.language}.mp3`) },
  };
};

const ink = "#173630";
const white = "#fffdf7";
const pale = "#eaf5ef";
const mint = "#9de2bd";
const peach = "#f3c49d";

function Icon({ kind }: { kind: string }) {
  const line = { fill: "none", stroke: ink, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "observe") return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <circle cx="52" cy="45" r="18" fill={peach} stroke={ink} strokeWidth="4"/><path {...line} d="M19 118c0-23 14-40 33-40s33 17 33 40"/>
    <circle cx="121" cy="45" r="18" fill={mint} stroke={ink} strokeWidth="4"/><path {...line} d="M88 118c0-23 14-40 33-40s33 17 33 40"/>
    <path {...line} d="M71 23h31m-9-9 9 9-9 9"/>
  </svg>;
  if (kind === "invite") return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <path {...line} d="M39 78H21V25h84v53H65L45 96V78ZM82 117h68V64h-28"/>
    <path {...line} d="M38 46h49M38 58h37M100 87h32m-32 12h21"/>
    <circle cx="120" cy="35" r="12" fill={mint}/>
  </svg>;
  if (kind === "verify") return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <path {...line} d="M85 13 139 34v37c0 32-19 52-54 67-35-15-54-35-54-67V34Z"/>
    <path {...line} d="m58 75 18 18 37-41"/>
    <circle cx="85" cy="72" r="56" fill="none" stroke={mint} strokeWidth="5" strokeDasharray="9 10"/>
  </svg>;
  if (kind === "plan") return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <circle cx="31" cy="106" r="13" fill={peach} stroke={ink} strokeWidth="4"/>
    <path {...line} d="M44 106h34V73h34V41h24m-9-9 9 9-9 9"/>
    <rect x="117" y="70" width="39" height="51" rx="5" fill={pale} stroke={ink} strokeWidth="4"/>
    <path {...line} d="M128 121V96h17v25M126 83h21"/>
  </svg>;
  if (kind === "liph") return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <rect x="25" y="13" width="98" height="119" rx="8" fill={pale} stroke={ink} strokeWidth="4"/>
    <path {...line} d="m40 46 7 7 11-13m13 9h35M40 80l7 7 11-13m13 9h28"/>
    <circle cx="125" cy="99" r="31" fill={mint} stroke={ink} strokeWidth="4"/>
    <path {...line} d="M125 80v19l12 8"/>
  </svg>;
  return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <circle cx="85" cy="73" r="54" fill={pale} stroke={ink} strokeWidth="4"/>
    <path {...line} d="m56 73 20 20 39-43"/>
    <circle cx="85" cy="73" r="67" fill="none" stroke={mint} strokeWidth="4" strokeDasharray="8 9"/>
  </svg>;
}

const summarySteps = [
  { icon: "invite", fil: "Makinig", en: "Listen" },
  { icon: "verify", fil: "Iulat ang nakita", en: "Report what was seen" },
  { icon: "plan", fil: "Magplano", en: "Plan together" },
  { icon: "liph", fil: "Magbalik ng sagot", en: "Report back" },
];

function SummaryCards({ frame }: { frame: number }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, width: 768, margin: "26px auto 0" }}>
    {summarySteps.map((step, index) => {
      const opacity = interpolate(frame, [index * 7, index * 7 + 12], [0, 1], clamp);
      const y = interpolate(frame, [index * 7, index * 7 + 12], [20, 0], clamp);
      return <div key={step.icon} style={{ opacity, transform: `translateY(${y}px)`, background: white, borderRadius: 18, padding: "16px 8px", minHeight: 190, display: "flex", alignItems: "center", flexDirection: "column", boxShadow: "0 9px 24px #102c2440" }}>
        <div style={{ transform: "scale(.57)", width: 170, height: 99, transformOrigin: "top center" }}><Icon kind={step.icon}/></div>
        <div style={{ color: ink, fontWeight: 800, fontSize: 18, textAlign: "center", lineHeight: 1.15, marginTop: 8 }}>{step.fil}<br/><span style={{ fontWeight: 600, fontSize: 16 }}>{step.en}</span></div>
      </div>;
    })}
  </div>;
}

function BeatScene({ index, language }: { index: number; language: "fil" | "en" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = COMMUNITY_ORGANIZER_BEATS[index];
  const enter = spring({ frame, fps, config: { damping: 200, stiffness: 115 } });
  const opacity = interpolate(frame, [0, 10], [0, 1], clamp);
  const float = Math.sin(frame / 15) * 3;
  const summary = beat.id === "summary";
  return <AbsoluteFill style={{ background: "linear-gradient(130deg, #0c4b3b 0%, #156451 55%, #25745a 100%)", fontFamily: "Arial, 'Noto Sans', sans-serif", overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 470, height: 470, right: -145, top: -190, borderRadius: "50%", background: "#8fe0b443" }}/>
    <div style={{ position: "absolute", width: 420, height: 420, left: -160, bottom: -290, borderRadius: "50%", background: "#f3c49d25" }}/>
    <div style={{ position: "absolute", left: 42, top: 31, color: "#d8f2e3", fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>BHW CONNECT  ·  1.1.3</div>
    <div style={{ position: "absolute", right: 42, top: 29, display: "flex", gap: 5, alignItems: "end", height: 20 }} aria-hidden="true">
      {[0, 1, 2, 3].map((bar) => <div key={bar} style={{ width: 5, height: 7 + Math.abs(Math.sin(frame / 4 + bar)) * 13, borderRadius: 4, background: mint }}/>)
    }</div>
    {summary ? <div style={{ margin: "71px auto 0", width: 790, textAlign: "center", opacity }}>
      <h1 style={{ margin: 0, color: white, fontSize: 32, fontWeight: 800, lineHeight: 1.13 }}>{beat.title_fil}<br/>{beat.title_en}</h1>
      <SummaryCards frame={frame}/>
      <div style={{ color: pale, fontSize: 17, marginTop: 17 }}>{beat.detail_fil} / {beat.detail_en}</div>
    </div> : <>
      <div style={{ position: "absolute", left: 46, top: 137, width: 390, opacity, transform: `translateY(${(1 - enter) * 26}px)` }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: mint, marginBottom: 12 }}>{String(index + 1).padStart(2, "0")} / 06</div>
        <h1 style={{ margin: 0, fontSize: 43, lineHeight: 1.05, fontWeight: 800, color: white }}>{beat[`title_${language}`]}</h1>
        <p style={{ color: pale, fontSize: 25, lineHeight: 1.25, marginTop: 24 }}>{beat[`detail_${language}`]}</p>
      </div>
      <div style={{ position: "absolute", right: 48, top: 97, width: 335, height: 285, background: white, borderRadius: 24, boxShadow: "0 18px 40px #06251d85", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: enter, transform: `translateX(${(1 - enter) * 80}px) translateY(${float}px) rotate(${index === 0 ? -3 : 0}deg)` }}>
        <Icon kind={beat.id}/>
        <div style={{ marginTop: 7, color: ink, fontSize: 19, fontWeight: 700, textAlign: "center" }}>{beat[`title_${language}`]}</div>
      </div>
    </>}
    <div style={{ position: "absolute", bottom: 27, left: 42, display: "flex", gap: 8 }} aria-hidden="true">{COMMUNITY_ORGANIZER_BEATS.map((item, dot) => <div key={item.id} style={{ width: dot === index ? 28 : 9, height: 9, background: dot === index ? mint : "#a3ccb8", borderRadius: 10, opacity: dot === index ? 1 : .55 }}/>)}</div>
  </AbsoluteFill>;
}

export const CommunityOrganizerStory: React.FC<CommunityOrganizerStoryProps> = ({ language, beatFrames, audioSrc }) => {
  const durations = beatFrames ?? COMMUNITY_ORGANIZER_BEATS.map(() => COMMUNITY_ORGANIZER_FPS * 10);
  return <AbsoluteFill>
    {audioSrc && <Audio src={audioSrc}/>}
    <Series>{COMMUNITY_ORGANIZER_BEATS.map((beat, index) => <Series.Sequence key={beat.id} durationInFrames={durations[index]}><BeatScene index={index} language={language}/></Series.Sequence>)}</Series>
  </AbsoluteFill>;
};

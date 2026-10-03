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
import { ROLES_HEPO_BEATS } from "./narration";

export const ROLES_HEPO_FPS = 30;
export const ROLES_HEPO_FALLBACK_DURATION = ROLES_HEPO_FPS * 75;
const TAIL_SECONDS = 1.2;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type RolesHepoStoryProps = {
  language: "fil" | "en" | "ceb" | "hil";
  beatFrames?: number[];
  audioSrc?: string;
};

type NarrationTimings = {
  language: string;
  durationSeconds: number;
  beats: { zone: string; start_ms: number; end_ms: number }[];
};

export const calculateRolesHepoMetadata: CalculateMetadataFunction<RolesHepoStoryProps> = async ({ props }) => {
  const response = await fetch(staticFile(`roles-hepo/narration-${props.language}.json`)).catch(() => null);
  if (!response?.ok) return { durationInFrames: ROLES_HEPO_FALLBACK_DURATION, props };
  const timings: NarrationTimings = await response.json();
  if (timings.language !== props.language || timings.beats.length !== ROLES_HEPO_BEATS.length ||
      timings.beats.some((beat, index) => beat.zone !== ROLES_HEPO_BEATS[index].id))
    throw new Error("roles-hepo narration timing does not match the authored beats");
  const boundaries = [...timings.beats.map((beat) => beat.start_ms), timings.durationSeconds * 1000 + TAIL_SECONDS * 1000];
  const atFrame = (ms: number) => Math.round(ms * ROLES_HEPO_FPS / 1000);
  const beatFrames = boundaries.slice(1).map((ms, index) => atFrame(ms) - atFrame(boundaries[index]));
  if (beatFrames.some((frames) => frames < 1)) throw new Error("roles-hepo narration has an empty beat");
  return {
    durationInFrames: beatFrames.reduce((sum, frames) => sum + frames, 0),
    props: { ...props, beatFrames, audioSrc: staticFile(`roles-hepo/narration-${props.language}.mp3`) },
  };
};

const ink = "#244039";
const white = "#fffdf7";
const pale = "#edf7ec";
const mint = "#bfe6c3";
const peach = "#ffcf8b";

function Icon({ kind }: { kind: string }) {
  const line = { fill: "none", stroke: ink, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "morning") return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <circle cx="85" cy="68" r="50" fill={pale} stroke={ink} strokeWidth="4"/>
    <path {...line} d="M85 33v35l22 15M85 19v-8M35 68h-8m116 0h-8M85 117v8"/>
    <circle cx="85" cy="68" r="5" fill={peach}/>
    <circle cx="33" cy="126" r="7" fill={mint}/><circle cx="85" cy="126" r="7" fill={peach}/><circle cx="137" cy="126" r="7" fill={mint}/>
  </svg>;
  if (kind === "educate") return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <path {...line} d="M16 29h119v73H69l-25 23v-23H16Z"/>
    <path {...line} d="M38 50h75M38 66h57M38 82h69"/>
    <circle cx="139" cy="30" r="17" fill={peach} stroke={ink} strokeWidth="3"/>
    <path {...line} d="M139 21v18m-9-9h18"/>
  </svg>;
  if (kind === "organize") return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <circle cx="85" cy="37" r="17" fill={peach} stroke={ink} strokeWidth="3"/>
    <circle cx="31" cy="66" r="14" fill={mint} stroke={ink} strokeWidth="3"/>
    <circle cx="139" cy="66" r="14" fill={mint} stroke={ink} strokeWidth="3"/>
    <path {...line} d="M56 119c0-24 11-41 29-41s29 17 29 41M8 121c0-20 8-33 23-33 8 0 15 4 19 12M162 121c0-20-8-33-23-33-8 0-15 4-19 12M50 52l18-8m52 0-18 8"/>
  </svg>;
  if (kind === "guide") return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <circle cx="35" cy="52" r="17" fill={peach} stroke={ink} strokeWidth="3"/>
    <path {...line} d="M9 120c0-24 10-43 26-43s26 19 26 43M65 71h52m-12-12 12 12-12 12"/>
    <rect x="121" y="41" width="37" height="72" rx="6" fill={pale} stroke={ink} strokeWidth="3"/>
    <path {...line} d="M139 55v22m-11-11h22"/>
  </svg>;
  if (kind === "hepo") return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <circle cx="52" cy="67" r="30" fill={mint} stroke={ink} strokeWidth="3"/>
    <circle cx="85" cy="67" r="30" fill={peach} fillOpacity=".9" stroke={ink} strokeWidth="3"/>
    <circle cx="118" cy="67" r="30" fill={pale} fillOpacity=".9" stroke={ink} strokeWidth="3"/>
    <text x="85" y="126" textAnchor="middle" fontFamily="Arial" fontSize="19" fontWeight="bold" fill={ink}>HEPO</text>
  </svg>;
  return <svg width="170" height="145" viewBox="0 0 170 145" aria-hidden="true">
    <circle cx="85" cy="73" r="54" fill={pale} stroke={ink} strokeWidth="4"/>
    <path {...line} d="m56 73 20 20 39-43"/>
    <circle cx="85" cy="73" r="67" fill="none" stroke={mint} strokeWidth="4" strokeDasharray="8 9"/>
  </svg>;
}

const summarySteps = [
  { icon: "educate", fil: "Magturo", en: "Educate", ceb: "Magtudlo", hil: "Magtudlo" },
  { icon: "organize", fil: "Mag-ugnay", en: "Connect", ceb: "Magkonektar", hil: "Mag-angot" },
  { icon: "guide", fil: "Gumabay", en: "Guide", ceb: "Mogiya", hil: "Maggiya" },
  { icon: "summary", fil: "Kumpirmahin", en: "Confirm", ceb: "Kumpirmahon", hil: "Kumpirmaha" },
];

function SummaryCards({ frame, language }: { frame: number; language: RolesHepoStoryProps["language"] }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, width: 768, margin: "26px auto 0" }}>
    {summarySteps.map((step, index) => {
      const opacity = interpolate(frame, [index * 7, index * 7 + 12], [0, 1], clamp);
      const y = interpolate(frame, [index * 7, index * 7 + 12], [20, 0], clamp);
      return <div key={step.icon} style={{ opacity, transform: `translateY(${y}px)`, background: white, borderRadius: 18, padding: "16px 8px", minHeight: 190, display: "flex", alignItems: "center", flexDirection: "column", boxShadow: "0 9px 24px #102c2440" }}>
        <div style={{ transform: "scale(.57)", width: 170, height: 99, transformOrigin: "top center" }}><Icon kind={step.icon}/></div>
        <div style={{ color: ink, fontWeight: 800, fontSize: 18, textAlign: "center", lineHeight: 1.15, marginTop: 8 }}>{language === "ceb" || language === "hil" ? step[language] : <>{step.fil}<br/><span style={{ fontWeight: 600, fontSize: 16 }}>{step.en}</span></>}</div>
      </div>;
    })}
  </div>;
}

function BeatScene({ index, language }: { index: number; language: RolesHepoStoryProps["language"] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = ROLES_HEPO_BEATS[index];
  const enter = spring({ frame, fps, config: { damping: 200, stiffness: 115 } });
  const opacity = interpolate(frame, [0, 10], [0, 1], clamp);
  const float = Math.sin(frame / 15) * 3;
  const summary = beat.id === "summary";
  return <AbsoluteFill style={{ background: "linear-gradient(130deg, #203f3b 0%, #295c52 55%, #3c7a65 100%)", fontFamily: "Arial, 'Noto Sans', sans-serif", overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 470, height: 470, right: -145, top: -190, borderRadius: "50%", background: "#a9e6ed43" }}/>
    <div style={{ position: "absolute", width: 420, height: 420, left: -160, bottom: -290, borderRadius: "50%", background: "#ffd59b25" }}/>
    <div style={{ position: "absolute", left: 42, top: 31, color: "#d8f2e3", fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>BHW CONNECT  ·  1.1.1</div>
    <div style={{ position: "absolute", right: 42, top: 29, display: "flex", gap: 5, alignItems: "end", height: 20 }} aria-hidden="true">
      {[0, 1, 2, 3].map((bar) => <div key={bar} style={{ width: 5, height: 7 + Math.abs(Math.sin(frame / 4 + bar)) * 13, borderRadius: 4, background: mint }}/>)
    }</div>
    {summary ? <div style={{ margin: "71px auto 0", width: 790, textAlign: "center", opacity }}>
      <h1 style={{ margin: 0, color: white, fontSize: 32, fontWeight: 800, lineHeight: 1.13 }}>{language === "ceb" || language === "hil" ? beat[`title_${language}`] : <>{beat.title_fil}<br/>{beat.title_en}</>}</h1>
      <SummaryCards frame={frame} language={language}/>
      <div style={{ color: pale, fontSize: 17, marginTop: 17 }}>{language === "ceb" || language === "hil" ? beat[`detail_${language}`] : `${beat.detail_fil} / ${beat.detail_en}`}</div>
    </div> : <>
      <div style={{ position: "absolute", left: 46, top: 137, width: 390, opacity, transform: `translateY(${(1 - enter) * 26}px)` }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: mint, marginBottom: 12 }}>{String(index + 1).padStart(2, "0")} / 06</div>
        <h1 style={{ margin: 0, fontSize: language === "ceb" || language === "hil" ? 37 : 43, lineHeight: 1.05, fontWeight: 800, color: white }}>{beat[`title_${language}`]}</h1>
        <p style={{ color: pale, fontSize: 25, lineHeight: 1.25, marginTop: 24 }}>{beat[`detail_${language}`]}</p>
      </div>
      <div style={{ position: "absolute", right: 48, top: 97, width: 335, height: 285, background: white, borderRadius: 24, boxShadow: "0 18px 40px #06251d85", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: enter, transform: `translateX(${(1 - enter) * 80}px) translateY(${float}px) rotate(${index === 0 ? -3 : 0}deg)` }}>
        <Icon kind={beat.id}/>
        <div style={{ marginTop: 7, color: ink, fontSize: 19, fontWeight: 700, textAlign: "center" }}>{beat[`title_${language}`]}</div>
      </div>
    </>}
    <div style={{ position: "absolute", bottom: 27, left: 42, display: "flex", gap: 8 }} aria-hidden="true">{ROLES_HEPO_BEATS.map((item, dot) => <div key={item.id} style={{ width: dot === index ? 28 : 9, height: 9, background: dot === index ? mint : "#a3ccb8", borderRadius: 10, opacity: dot === index ? 1 : .55 }}/>)}</div>
  </AbsoluteFill>;
}

export const RolesHepoStory: React.FC<RolesHepoStoryProps> = ({ language, beatFrames, audioSrc }) => {
  const durations = beatFrames ?? ROLES_HEPO_BEATS.map(() => ROLES_HEPO_FPS * 10);
  return <AbsoluteFill>
    {audioSrc && <Audio src={audioSrc}/>}
    <Series>{ROLES_HEPO_BEATS.map((beat, index) => <Series.Sequence key={beat.id} durationInFrames={durations[index]}><BeatScene index={index} language={language}/></Series.Sequence>)}</Series>
  </AbsoluteFill>;
};

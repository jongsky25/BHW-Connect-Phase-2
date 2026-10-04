import {
  AbsoluteFill, Audio, Img, Series, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, type CalculateMetadataFunction,
} from "remotion";
import { LOCAL_SYSTEM_BEATS } from "./narration";

export const LOCAL_SYSTEM_FPS = 30;
export const LOCAL_SYSTEM_FALLBACK_DURATION = LOCAL_SYSTEM_FPS * 80;
const TAIL_MS = 1100;
export type LocalSystemStoryProps = {language: "fil" | "en"; beatFrames?: number[]; audioSrc?: string};
type Timings = {language: string; durationSeconds: number; beats: {zone: string; start_ms: number; end_ms: number}[]};

export const calculateLocalSystemMetadata: CalculateMetadataFunction<LocalSystemStoryProps> = async ({props}) => {
  const response = await fetch(staticFile(`uhc-local-system/narration-${props.language}.json`));
  if (!response.ok) throw new Error("Local-system narration must exist before composition registration");
  const timing: Timings = await response.json();
  if (timing.language !== props.language || timing.beats.length !== LOCAL_SYSTEM_BEATS.length ||
    timing.beats.some((beat, i) => beat.zone !== LOCAL_SYSTEM_BEATS[i].id || beat.end_ms <= beat.start_ms ||
      (i > 0 && beat.start_ms < timing.beats[i - 1].end_ms)) ||
    timing.beats[timing.beats.length - 1].end_ms > timing.durationSeconds * 1000 + 50)
    throw new Error("Local-system timings do not match the measured authored scenes");
  const boundaries = [...timing.beats.map(b => b.start_ms), timing.durationSeconds * 1000 + TAIL_MS];
  const frame = (ms: number) => Math.round(ms * LOCAL_SYSTEM_FPS / 1000);
  const beatFrames = timing.beats.map((_, i) => frame(boundaries[i + 1]) - frame(boundaries[i]));
  if (beatFrames.some(n => n < 1)) throw new Error("Local-system narration has an empty scene");
  return {durationInFrames: beatFrames.reduce((sum, n) => sum + n, 0),
    props: {...props, beatFrames, audioSrc: staticFile(`uhc-local-system/narration-${props.language}.mp3`)}};
};

const ink = "#153e39";
const cream = "#fffaf0";
const gold = "#f9d884";
function Cards({items, frame}: {items: string[]; frame: number}) {
  return <div style={{display: "flex", gap: 12, justifyContent: "center"}}>
    {items.map((item, i) => {
      const enter = spring({frame: frame - i * 11, fps: LOCAL_SYSTEM_FPS, config: {damping: 180, stiffness: 95}});
      return <div key={item} style={{flex: 1, maxWidth: 230, minHeight: 102, background: i === 0 ? gold : cream,
        color: ink, padding: "17px 13px", borderRadius: 17, fontSize: 22, fontWeight: 800, lineHeight: 1.2,
        opacity: enter, transform: `translateY(${(1 - enter) * 25}px)`, boxShadow: "0 8px 24px #002c2833"}}>
        <div style={{fontSize: 14, marginBottom: 8, color: "#507267"}}>0{i + 1}</div>{item}</div>;
    })}
  </div>;
}

function Scene({index, language}: {index: number; language: "fil" | "en"}) {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const fil = language === "fil";
  const beat = LOCAL_SYSTEM_BEATS[index];
  const appear = spring({frame, fps, config: {damping: 180, stiffness: 95}});
  const hasArt = index === 0 || index === 5;
  const labels = index === 1
    ? (fil ? ["Board: integration", "Team: lokal na proseso", "BHW: ambag"] : ["Board: integration", "Team: local process", "BHW: contribution"])
    : index === 2
      ? (fil ? ["Narinig", "Hindi pa tiyak", "Walang personal na detalye"] : ["Observed", "Still uncertain", "No personal details"])
      : index === 3
        ? (fil ? ["Tiyakin sa team", "Ipaliwanag", "Suriin ang pagkaunawa"] : ["Check with team", "Explain simply", "Check understanding"])
        : (fil ? ["Sino ang contact?", "Sino ang may pasya?", "Paano ang tugon?"] : ["Who is the contact?", "Who can decide?", "How will feedback arrive?"]);
  return <AbsoluteFill style={{background: "linear-gradient(135deg, #0c483f, #246e61)", color: cream, fontFamily: "Arial, sans-serif", overflow: "hidden"}}>
    <div style={{position: "absolute", width: 470, height: 470, right: -110, top: -295, borderRadius: "50%", background: "#d1efc31c"}}/>
    <div style={{position: "absolute", top: 27, left: 40, fontSize: 16, letterSpacing: 2, fontWeight: 900, color: "#c9edb0"}}>BHW CONNECT · 1.2.3</div>
    <div style={{position: "absolute", top: 27, right: 40, fontSize: 16}}>{index + 1} / 6</div>
    <div style={{position: "absolute", top: 98, left: 40, width: hasArt ? 335 : 760,
      transform: `translateY(${(1 - appear) * 20}px)`, opacity: appear}}>
      <div style={{fontSize: 16, fontWeight: 900, color: gold, marginBottom: 12}}>{fil ? "KOMUNIDAD AT HEALTH TEAM" : "COMMUNITY AND HEALTH TEAM"}</div>
      <div style={{fontSize: hasArt ? 36 : 43, lineHeight: 1.1, fontWeight: 900}}>{fil ? beat.title_fil : beat.title_en}</div>
      <div style={{fontSize: 22, lineHeight: 1.3, marginTop: 18}}>{fil ? beat.detail_fil : beat.detail_en}</div>
    </div>
    {hasArt ? <div style={{position: "absolute", right: 28, top: 110, width: 420, height: 245,
      background: cream, borderRadius: 18, padding: 7, opacity: appear, transform: `translateX(${(1 - appear) * 25}px)`}}>
      <Img src={staticFile("uhc-local-system/scene.png")} style={{width: "100%", height: "100%", objectFit: "contain", borderRadius: 12}}/>
    </div> : <div style={{position: "absolute", top: 275, left: 42, width: 770}}><Cards items={labels} frame={frame}/></div>}
    {index === 5 && <div style={{position: "absolute", bottom: 83, left: 40, display: "flex", gap: 12}}>
      {(fil ? ["Obserbasyon", "Mensahe", "Follow-up"] : ["Observation", "Message", "Follow-up"]).map((label,i) =>
        <div key={label} style={{background: i === 0 ? gold : cream, color: ink, fontSize: 20, fontWeight: 800,
          padding: "11px 16px", borderRadius: 12, opacity: spring({frame: frame - i * 12, fps, config: {damping: 180}})}}>{label}</div>)}
    </div>}
    <div style={{position: "absolute", bottom: 22, left: 40, width: 774, height: 4, background: "#d0ecde55", borderRadius: 3}}>
      <div style={{height: "100%", width: `${interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 100], {extrapolateRight: "clamp"})}%`, background: gold}}/>
    </div>
  </AbsoluteFill>;
}

export function LocalSystemStory({language, beatFrames, audioSrc}: LocalSystemStoryProps) {
  const frames = beatFrames ?? LOCAL_SYSTEM_BEATS.map(() => LOCAL_SYSTEM_FPS * 12);
  return <AbsoluteFill><Series>{LOCAL_SYSTEM_BEATS.map((beat, index) =>
    <Series.Sequence key={beat.id} durationInFrames={frames[index]}><Scene index={index} language={language}/></Series.Sequence>)}</Series>
    {audioSrc && <Audio src={audioSrc}/>}</AbsoluteFill>;
}

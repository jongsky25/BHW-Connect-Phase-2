import {
  AbsoluteFill,
  Audio,
  Img,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { PRIMARY_CARE_BEATS, PRIMARY_CARE_LABELS } from "./narration";

export const PRIMARY_CARE_FPS = 30;
export const PRIMARY_CARE_FALLBACK_DURATION = PRIMARY_CARE_FPS * 72;
const TAIL_MS = 1100;
const ease = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type PrimaryCareStoryProps = {
  language: "fil" | "en" | "ceb" | "hil";
  beatFrames?: number[];
  audioSrc?: string;
};

type Timings = {
  language: string;
  durationSeconds: number;
  beats: { zone: string; start_ms: number; end_ms: number }[];
};

export const calculatePrimaryCareMetadata: CalculateMetadataFunction<PrimaryCareStoryProps> = async ({ props }) => {
  const response = await fetch(staticFile(`uhc-primary-care/narration-${props.language}.json`)).catch(() => null);
  if (!response?.ok) return { durationInFrames: PRIMARY_CARE_FALLBACK_DURATION, props };
  const timing: Timings = await response.json();
  if (timing.language !== props.language || timing.beats.length !== PRIMARY_CARE_BEATS.length ||
      timing.beats.some((beat, i) => beat.zone !== PRIMARY_CARE_BEATS[i].id || beat.end_ms <= beat.start_ms))
    throw new Error("Primary-care narration timings do not match the authored scenes");
  const starts = timing.beats.map((beat) => beat.start_ms);
  const boundaries = [...starts, timing.durationSeconds * 1000 + TAIL_MS];
  const frame = (ms: number) => Math.round(ms * PRIMARY_CARE_FPS / 1000);
  const beatFrames = starts.map((_, i) => frame(boundaries[i + 1]) - frame(boundaries[i]));
  if (beatFrames.some((n) => n < 1)) throw new Error("Primary-care narration has an empty scene");
  return {
    durationInFrames: beatFrames.reduce((sum, n) => sum + n, 0),
    props: { ...props, beatFrames, audioSrc: staticFile(`uhc-primary-care/narration-${props.language}.mp3`) },
  };
};

const ink = "#133c36";
const forest = "#0c483f";
const cream = "#fffaf0";
const leaf = "#c9edb0";
const gold = "#f9d884";

function Pill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return <span style={{ display: "inline-block", background: active ? gold : "#dcefe7", color: ink, borderRadius: 12, padding: "10px 14px", fontSize: 18, fontWeight: 800, whiteSpace: "nowrap" }}>{children}</span>;
}

function Graphic({ index, language, frame }: { index: number; language: "fil" | "en" | "ceb" | "hil"; frame: number }) {
  const items = PRIMARY_CARE_LABELS[language].items;
  const appear = spring({ frame, fps: PRIMARY_CARE_FPS, config: { damping: 180, stiffness: 100 } });
  const slide = { transform: `translateY(${(1 - appear) * 20}px)`, opacity: appear };
  if (index === 0 || index === 5) {
    return <div style={{ position: "absolute", right: 30, top: 105, height: 265, width: 395, borderRadius: 20, overflow: "hidden", transform: `translateY(${(1 - appear) * 18}px)`, opacity: appear }}>
      <Img src={staticFile("uhc-primary-care/scene.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%", transform: `scale(${1 + Math.min(frame / 6000, 0.025)})` }}/>
    </div>;
  }

  if (index === 1) return <div style={{ ...slide, position: "absolute", top: 274, left: 42, display: "flex", gap: 9 }}>
    {items.map((item, i) => <div key={item} style={{ width: i === 0 ? 165 : 178, background: i === 0 ? gold : cream, color: ink, borderRadius: 16, padding: "18px 11px", boxShadow: "0 8px 24px #002c2844", textAlign: "center", fontSize: 19, fontWeight: 800 }}>
      <div style={{ color: "#468572", fontSize: 14, marginBottom: 6 }}>0{i + 1}</div>{item}
    </div>)}
  </div>;
  if (index === 2) return <div style={{ ...slide, position: "absolute", top: 276, left: 60, display: "flex", gap: 16 }}>
    {PRIMARY_CARE_LABELS[language].outpatient.map((label, i) => <Pill key={label} active={i === 0}>{label}</Pill>)}
  </div>;
  if (index === 3) return <div style={{ ...slide, position: "absolute", top: 274, left: 60, display: "flex", gap: 16 }}>
    {PRIMARY_CARE_LABELS[language].provider.map((label, i) => <Pill key={label} active={i === 0}>{label}</Pill>)}
  </div>;
  return <div style={{ ...slide, position: "absolute", top: 266, left: 60, display: "flex", gap: 14 }}>
    {PRIMARY_CARE_LABELS[language].referral.map((label, i) => <Pill key={label} active={i === 0}>{label}</Pill>)}
  </div>;
}

function Scene({ index, language }: { index: number; language: "fil" | "en" | "ceb" | "hil" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = PRIMARY_CARE_BEATS[index];
  const title = beat[`title_${language}`];
  const detail = beat[`detail_${language}`];
  const appear = spring({ frame, fps, config: { damping: 180, stiffness: 95 } });
  const progress = interpolate(frame, [0, fps * 10], [0, 1], ease);
  return <AbsoluteFill style={{ background: `linear-gradient(135deg, ${forest}, #246e61)`, color: cream, overflow: "hidden", fontFamily: "Arial, 'Noto Sans', sans-serif" }}>
    <div style={{ position: "absolute", width: 530, height: 530, right: -125, top: -325, borderRadius: "50%", background: "#d1efc31c" }}/>
    <div style={{ position: "absolute", width: 500, height: 500, left: -210, bottom: -410, borderRadius: "50%", background: "#d1efc31c" }}/>
    <Graphic index={index} language={language} frame={frame}/>
    <div style={{ position: "absolute", top: 28, left: 42, fontSize: 16, letterSpacing: 2, fontWeight: 900, color: leaf }}>BHW CONNECT  ·  1.2.2</div>
    <div style={{ position: "absolute", top: 28, right: 40, fontSize: 16, fontWeight: 800, color: cream }}>{String(index + 1).padStart(2, "0")} / 06</div>
    <div style={{ position: "absolute", top: 104, left: 42, width: index === 0 || index === 5 ? 355 : 760, transform: `translateY(${(1 - appear) * 22}px)`, opacity: appear }}>
      <div style={{ color: gold, fontSize: 17, letterSpacing: 1.2, fontWeight: 900, textTransform: "uppercase", marginBottom: 13 }}>{index === 0 ? "Vlanche + Mang Ernesto" : PRIMARY_CARE_LABELS[language].next_step}</div>
      <div style={{ fontSize: index === 0 || index === 5 ? 38 : title.length > 27 ? 39 : 47, fontWeight: 900, lineHeight: 1.08, textShadow: "0 3px 12px #002d2b66" }}>{title}</div>
      <div style={{ fontSize: 22, lineHeight: 1.25, marginTop: 17, fontWeight: 600, maxWidth: 685 }}>{detail}</div>
    </div>
    {index === 5 && <div style={{ position: "absolute", bottom: 85, left: 44, display: "flex", gap: 11 }}>{PRIMARY_CARE_LABELS[language].summary.map((label, i) => <Pill key={label} active={i === 0}>{label}</Pill>)}</div>}
    <div style={{ position: "absolute", bottom: 22, left: 42, width: 770, height: 4, borderRadius: 3, background: "#d0ecde55" }}>
      <div style={{ height: "100%", width: `${Math.min(100, progress * 100)}%`, background: gold, borderRadius: 3 }}/>
    </div>
  </AbsoluteFill>;
}

export function PrimaryCareStory({ language, beatFrames, audioSrc }: PrimaryCareStoryProps) {
  const frames = beatFrames ?? PRIMARY_CARE_BEATS.map(() => PRIMARY_CARE_FPS * 11);
  return <AbsoluteFill>
    <Series>{PRIMARY_CARE_BEATS.map((beat, index) =>
      <Series.Sequence key={beat.id} durationInFrames={frames[index]}><Scene index={index} language={language}/></Series.Sequence>)}</Series>
    {audioSrc && <Audio src={audioSrc}/>}
  </AbsoluteFill>;
}

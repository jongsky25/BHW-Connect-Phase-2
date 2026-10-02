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
import { UHC_PURPOSE_BEATS } from "./narration";

export const UHC_PURPOSE_FPS = 30;
export const UHC_PURPOSE_FALLBACK_DURATION = UHC_PURPOSE_FPS * 65;
const TAIL_SECONDS = 1.2;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type UhcPurposeStoryProps = {
  language: "fil" | "en";
  beatFrames?: number[];
  audioSrc?: string;
};

type Timings = {
  language: string;
  durationSeconds: number;
  beats: { zone: string; start_ms: number; end_ms: number }[];
};

export const calculateUhcPurposeMetadata: CalculateMetadataFunction<UhcPurposeStoryProps> = async ({ props }) => {
  const response = await fetch(staticFile(`uhc-purpose/narration-${props.language}.json`)).catch(() => null);
  if (!response?.ok) return { durationInFrames: UHC_PURPOSE_FALLBACK_DURATION, props };
  const timings: Timings = await response.json();
  if (timings.language !== props.language || timings.beats.length !== UHC_PURPOSE_BEATS.length ||
      timings.beats.some((beat, index) => beat.zone !== UHC_PURPOSE_BEATS[index].id))
    throw new Error("UHC narration timings do not match the authored beats");
  const boundaries = [...timings.beats.map((beat) => beat.start_ms), timings.durationSeconds * 1000 + TAIL_SECONDS * 1000];
  const atFrame = (ms: number) => Math.round(ms * UHC_PURPOSE_FPS / 1000);
  const beatFrames = boundaries.slice(1).map((ms, index) => atFrame(ms) - atFrame(boundaries[index]));
  if (beatFrames.some((frames) => frames < 1)) throw new Error("UHC narration has an empty beat");
  return {
    durationInFrames: beatFrames.reduce((sum, frames) => sum + frames, 0),
    props: { ...props, beatFrames, audioSrc: staticFile(`uhc-purpose/narration-${props.language}.mp3`) },
  };
};

const ink = "#173630";
const mint = "#96ddbb";
const white = "#fffdf7";

function LabelCard({ title, detail, frame, number }: { title: string; detail: string; frame: number; number: number }) {
  const enter = spring({ frame, fps: UHC_PURPOSE_FPS, config: { damping: 200, stiffness: 110 } });
  return <div style={{ transform: `translateY(${(1 - enter) * 28}px)`, opacity: enter, background: white, borderRadius: 24, padding: "28px 34px", width: 710, boxShadow: "0 16px 42px #0a382a55" }}>
    <div style={{ color: "#33735d", fontSize: 17, fontWeight: 800, letterSpacing: 2, marginBottom: 14 }}>{String(number).padStart(2, "0")}</div>
    <div style={{ color: ink, fontSize: title.length > 35 ? 35 : 42, fontWeight: 850, lineHeight: 1.1 }}>{title}</div>
    <div style={{ color: "#315b4d", fontSize: 23, fontWeight: 600, marginTop: 19, lineHeight: 1.25 }}>{detail}</div>
  </div>;
}

function BeatScene({ index, language }: { index: number; language: "fil" | "en" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = UHC_PURPOSE_BEATS[index];
  const title = language === "fil" ? beat.title_fil : beat.title_en;
  const detail = language === "fil" ? beat.detail_fil : beat.detail_en;
  const opacity = interpolate(frame, [0, 12], [0, 1], clamp);
  const photo = index === 0 || index === 5;
  return <AbsoluteFill style={{ background: "linear-gradient(135deg, #0b4c3c, #28775c)", overflow: "hidden", fontFamily: "Arial, 'Noto Sans', sans-serif" }}>
    {photo && <Img src={staticFile("uhc-purpose/scene.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.03 + Math.min(frame / (fps * 60), 0.035)})`, opacity: index === 0 ? 0.86 : 0.25 }}/>}
    <div style={{ position: "absolute", inset: 0, background: photo ? "linear-gradient(90deg, #0b392fdd, #0b392f88 58%, #0b392f22)" : "transparent" }}/>
    {!photo && <>
      <div style={{ position: "absolute", width: 440, height: 440, right: -130, top: -180, borderRadius: "50%", background: "#a9e7bc33" }}/>
      <div style={{ position: "absolute", width: 360, height: 360, left: -140, bottom: -240, borderRadius: "50%", background: "#a9e7bc25" }}/>
    </>}
    <div style={{ position: "absolute", left: 42, top: 30, color: "#e6f4e9", fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>BHW CONNECT  ·  1.2.1</div>
    {index === 0 ? <div style={{ position: "absolute", left: 48, bottom: 48, maxWidth: 620, opacity }}>
      <div style={{ color: mint, fontSize: 20, fontWeight: 800, marginBottom: 15 }}>Vlanche + Mang Ernesto</div>
      <div style={{ color: white, fontSize: 51, fontWeight: 850, lineHeight: 1.04, textShadow: "0 4px 18px #0a3029" }}>{title}</div>
      <div style={{ color: white, fontSize: 25, marginTop: 18, fontWeight: 600 }}>{detail}</div>
    </div> : index === 5 ? <div style={{ position: "absolute", left: 58, top: 123, maxWidth: 740, opacity }}>
      <div style={{ color: mint, fontSize: 19, fontWeight: 800, marginBottom: 17 }}>Vlanche's answer</div>
      <div style={{ color: white, fontSize: 42, fontWeight: 850, lineHeight: 1.1, textShadow: "0 4px 18px #0a3029" }}>{title}</div>
      <div style={{ color: white, fontSize: 23, marginTop: 20, fontWeight: 600 }}>{detail}</div>
      <div style={{ display: "flex", gap: 12, marginTop: 31 }}>
        {(language === "fil" ? ["Kasama", "Benepisyo", "Provider", "Hakbang"] : ["Included", "Benefit", "Provider", "Steps"]).map((word) =>
          <span key={word} style={{ background: white, color: ink, borderRadius: 12, padding: "9px 13px", fontSize: 17, fontWeight: 800 }}>{word}</span>) }
      </div>
    </div> : <div style={{ position: "absolute", left: 72, top: 120 }}><LabelCard title={title} detail={detail} frame={frame} number={index + 1}/></div>}
  </AbsoluteFill>;
}

export function UhcPurposeStory({ language, beatFrames, audioSrc }: UhcPurposeStoryProps) {
  const frames = beatFrames ?? UHC_PURPOSE_BEATS.map(() => UHC_PURPOSE_FPS * 10);
  return <AbsoluteFill>
    <Series>{UHC_PURPOSE_BEATS.map((beat, index) =>
      <Series.Sequence key={beat.id} durationInFrames={frames[index]}><BeatScene index={index} language={language}/></Series.Sequence>)}</Series>
    {audioSrc && <Audio src={audioSrc}/>}
  </AbsoluteFill>;
}

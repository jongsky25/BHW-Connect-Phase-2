import {AbsoluteFill, Audio, Img, Series, spring, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from "remotion";
import {PROBLEM_ACTION_PLAN_BEATS} from "./narration";

// Lesson 1.7.4 draft; owner review pending.
// Each language uses measured narration boundaries, including its final summary.

export const PROBLEM_ACTION_PLAN_FPS = 30;
export const PROBLEM_ACTION_PLAN_FALLBACK_DURATION = 75 * PROBLEM_ACTION_PLAN_FPS;
export type ProblemActionPlanStoryProps = {language: "fil" | "en"; beatFrames?: number[]; audioSrc?: string};
type Timings = {language: string; durationSeconds: number; beats: {zone: string; index: number; text: string; start_ms: number; end_ms: number}[]};

export const calculateProblemActionPlanMetadata: CalculateMetadataFunction<ProblemActionPlanStoryProps> = async ({props}) => {
  const response = await fetch(staticFile(`problem-action-plan/narration-${props.language}.json`));
  if (!response.ok) throw new Error("ProblemActionPlan story requires measured narration timings");
  const timing: Timings = await response.json();
  if (timing.language !== props.language || !Number.isFinite(timing.durationSeconds) || timing.durationSeconds <= 0 ||
    timing.durationSeconds + 1.1 > 90 || timing.beats.length !== PROBLEM_ACTION_PLAN_BEATS.length ||
    timing.beats[0].start_ms !== 0 || timing.beats.some((b, i) =>
      b.zone !== PROBLEM_ACTION_PLAN_BEATS[i].id || b.index !== i || b.text !== PROBLEM_ACTION_PLAN_BEATS[i][props.language] ||
      !Number.isFinite(b.start_ms) || !Number.isFinite(b.end_ms) ||
      b.end_ms <= b.start_ms || b.end_ms > timing.durationSeconds * 1000 + 50 ||
      (i > 0 && b.start_ms < timing.beats[i - 1].end_ms)))
    throw new Error("ProblemActionPlan scene timing mismatch");
  const boundaries = [...timing.beats.map(b => b.start_ms), timing.durationSeconds * 1000 + 1100];
  const beatFrames = timing.beats.map((_, i) => Math.round(boundaries[i + 1] * PROBLEM_ACTION_PLAN_FPS / 1000) - Math.round(boundaries[i] * PROBLEM_ACTION_PLAN_FPS / 1000));
  if (beatFrames.some(n => n < 1)) throw new Error("ProblemActionPlan story has an empty scene");
  return {durationInFrames: beatFrames.reduce((sum, n) => sum + n, 0), props: {...props, beatFrames, audioSrc: staticFile(`problem-action-plan/narration-${props.language}.mp3`)}};
};

const cream = "#fffaf2", gold = "#ffe5a3";
function Graphic({index}: {index: number; language: "fil" | "en"; frame: number}) {
  return <div style={{position: "absolute", right: 32, top: 105, width: 395, height: 264, background: cream, borderRadius: 20, overflow: "hidden"}}>
    <Img src={staticFile(`problem-action-plan/${PROBLEM_ACTION_PLAN_BEATS[index].id}.png`)} style={{width: "100%", height: "100%", objectFit: "contain"}}/>
  </div>;
}
function Scene({index, language}: {index: number; language: "fil" | "en"}) {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const beat = PROBLEM_ACTION_PLAN_BEATS[index];
  const framed = true;
  const enter = spring({frame, fps: PROBLEM_ACTION_PLAN_FPS, config: {damping: 180}});
  return <AbsoluteFill style={{background: "linear-gradient(135deg, #244e49, #386f63)", color: cream, fontFamily: "Arial, sans-serif", overflow: "hidden"}}>
    <div style={{position: "absolute", top: 28, left: 42, fontSize: 16, letterSpacing: 2, fontWeight: 900, color: gold}}>BHW CONNECT · 1.7.4</div>
    <div style={{position: "absolute", top: 28, right: 40, fontSize: 16, fontWeight: 800}}>{String(index + 1).padStart(2, "0")} / 06</div>
    <Graphic index={index} language={language} frame={frame}/>
    <div style={{position: "absolute", top: 96, left: 42, width: framed ? 345 : 770, opacity: enter, transform: `translateY(${(1 - enter) * 15}px)`}}>
      <div style={{fontSize: 16, fontWeight: 800, color: gold, marginBottom: 10}}>{index === 0 ? "Carole" : language === "fil" ? "Maliit na pagsubok" : "A small trial"}</div>
      <div style={{fontSize: framed ? 33 : 39, fontWeight: 900, lineHeight: 1.08}}>{beat[`title_${language}`]}</div>
      <div style={{fontSize: 30, marginTop: 15, lineHeight: 1.28}}>{beat[`detail_${language}`]}</div>
    </div>
    {index === 5 && <div style={{position: "absolute", bottom: 58, left: 42, display: "flex", gap: 12, fontWeight: 800, fontSize: 28}}><span>{language === "fil" ? "May kasunduan" : "Seek agreement"}</span><span>•</span><span>{language === "fil" ? "May review" : "Review outcomes"}</span></div>}
    <div style={{position: "absolute", left: 42, right: 42, bottom: 25, height: 4, background: "#ffffff33", borderRadius: 4}}><div style={{height: "100%", background: gold, width: `${Math.min(100, frame / Math.max(1, durationInFrames - 1) * 100)}%`}}/></div>
  </AbsoluteFill>;
}
export function ProblemActionPlanStory({language, beatFrames, audioSrc}: ProblemActionPlanStoryProps) {
  const frames = beatFrames ?? PROBLEM_ACTION_PLAN_BEATS.map(() => PROBLEM_ACTION_PLAN_FPS * 12);
  return <AbsoluteFill><Series>{PROBLEM_ACTION_PLAN_BEATS.map((beat, i) => <Series.Sequence key={beat.id} durationInFrames={frames[i]}><Scene index={i} language={language}/></Series.Sequence>)}</Series>{audioSrc && <Audio src={audioSrc}/>}</AbsoluteFill>;
}

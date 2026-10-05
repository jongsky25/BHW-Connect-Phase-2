import {AbsoluteFill, Audio, Img, Series, spring, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from "remotion";
import {BHW_FOLLOW_UP_BEATS} from "./narration";

// Lesson 1.4.5 draft; owner review pending.
// Each language uses measured narration boundaries, including its final summary.

export const FOLLOW_UP_FPS = 30;
export const FOLLOW_UP_FALLBACK_DURATION = 75 * FOLLOW_UP_FPS;
export type BhwFollowUpStoryProps = {language: "fil" | "en"; beatFrames?: number[]; audioSrc?: string};
type Timings = {language: string; durationSeconds: number; beats: {zone: string; index: number; text: string; start_ms: number; end_ms: number}[]};

export const calculateBhwFollowUpMetadata: CalculateMetadataFunction<BhwFollowUpStoryProps> = async ({props}) => {
  const response = await fetch(staticFile(`bhw-follow-up/narration-${props.language}.json`));
  if (!response.ok) throw new Error("BhwFollowUp story requires measured narration timings");
  const timing: Timings = await response.json();
  if (timing.language !== props.language || !Number.isFinite(timing.durationSeconds) || timing.durationSeconds <= 0 ||
    timing.durationSeconds + 1.1 > 90 || timing.beats.length !== BHW_FOLLOW_UP_BEATS.length ||
    timing.beats[0].start_ms !== 0 || timing.beats.some((b, i) =>
      b.zone !== BHW_FOLLOW_UP_BEATS[i].id || b.index !== i || b.text !== BHW_FOLLOW_UP_BEATS[i][props.language] ||
      !Number.isFinite(b.start_ms) || !Number.isFinite(b.end_ms) ||
      b.end_ms <= b.start_ms || b.end_ms > timing.durationSeconds * 1000 + 50 ||
      (i > 0 && b.start_ms < timing.beats[i - 1].end_ms)))
    throw new Error("BhwFollowUp scene timing mismatch");
  const boundaries = [...timing.beats.map(b => b.start_ms), timing.durationSeconds * 1000 + 1100];
  const beatFrames = timing.beats.map((_, i) => Math.round(boundaries[i + 1] * FOLLOW_UP_FPS / 1000) - Math.round(boundaries[i] * FOLLOW_UP_FPS / 1000));
  if (beatFrames.some(n => n < 1)) throw new Error("BhwFollowUp story has an empty scene");
  return {durationInFrames: beatFrames.reduce((sum, n) => sum + n, 0), props: {...props, beatFrames, audioSrc: staticFile(`bhw-follow-up/narration-${props.language}.mp3`)}};
};

const cream = "#fffaf2", gold = "#ffe5a3", ink = "#203f3b";
function Card({text, index, frame, highlight = false}: {text: string; index: number; frame: number; highlight?: boolean}) {
  const enter = spring({frame: frame - index * 14, fps: FOLLOW_UP_FPS, config: {damping: 180, stiffness: 90}});
  return <div style={{background: highlight ? gold : cream, color: ink, borderRadius: 16, padding: "18px 20px", fontWeight: 800, fontSize: 23, lineHeight: 1.2, opacity: enter, transform: `translateY(${(1 - enter) * 22}px)`, boxShadow: "0 8px 20px #062a2833"}}>{text}</div>;
}
function Graphic({index, language, frame}: {index: number; language: "fil" | "en"; frame: number}) {
  const fil = language === "fil";
  if (index === 0 || index === 5) return <div style={{position: "absolute", right: 32, top: 105, width: 395, height: 264, background: cream, borderRadius: 20, overflow: "hidden"}}>
    <Img src={staticFile("bhw-follow-up/scene.png")} style={{width: "100%", height: "100%", objectFit: "contain", transform: `scale(1)`}}/>
  </div>;
  const labels = index === 1
    ? fil ? ["Pakay", "Status", "Next step"] : ["Purpose", "Status", "Next step"]
    : index === 2
      ? fil ? ["A: malabo", "B: tiyak na tanong", "C: hula"] : ["A: vague", "B: specific question", "C: guess"]
      : index === 3
        ? fil ? ["Sinusuri pa", "Walang petsa", "Linawin ang sagot"] : ["Still under review", "No date yet", "Clarify the response"]
        : fil ? ["Tamang contact", "Napagkasunduan", "Practice note"] : ["Appropriate contact", "Agreed arrangement", "Practice note"];
  return <div style={{position: "absolute", top: 235, left: 42, right: 42, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "start", gap: 15}}>{labels.map((label, i) => <Card key={label} text={label} index={i} frame={frame} highlight={i === 0}/>)}</div>;
}
function Scene({index, language}: {index: number; language: "fil" | "en"}) {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const beat = BHW_FOLLOW_UP_BEATS[index];
  const framed = index === 0 || index === 5;
  const enter = spring({frame, fps: FOLLOW_UP_FPS, config: {damping: 180}});
  return <AbsoluteFill style={{background: "linear-gradient(135deg, #244e49, #386f63)", color: cream, fontFamily: "Arial, sans-serif", overflow: "hidden"}}>
    <div style={{position: "absolute", top: 28, left: 42, fontSize: 16, letterSpacing: 2, fontWeight: 900, color: gold}}>BHW CONNECT · 1.4.5</div>
    <div style={{position: "absolute", top: 28, right: 40, fontSize: 16, fontWeight: 800}}>{String(index + 1).padStart(2, "0")} / 06</div>
    <Graphic index={index} language={language} frame={frame}/>
    <div style={{position: "absolute", top: 96, left: 42, width: framed ? 345 : 770, opacity: enter, transform: `translateY(${(1 - enter) * 15}px)`}}>
      <div style={{fontSize: 16, fontWeight: 800, color: gold, marginBottom: 10}}>{index === 0 ? "Demi" : language === "fil" ? "Maayos na follow-up" : "Follow-up process"}</div>
      <div style={{fontSize: framed ? 33 : 39, fontWeight: 900, lineHeight: 1.08}}>{beat[`title_${language}`]}</div>
      <div style={{fontSize: 21, marginTop: 15, lineHeight: 1.28}}>{beat[`detail_${language}`]}</div>
    </div>
    {index === 5 && <div style={{position: "absolute", bottom: 58, left: 42, display: "flex", gap: 12, fontWeight: 800, fontSize: 18}}><span>{language === "fil" ? "Alam + tiyak na tanong" : "Facts + specific question"}</span><span>•</span><span>{language === "fil" ? "Linawin ang next contact" : "Clarify the next contact"}</span></div>}
    <div style={{position: "absolute", left: 42, right: 42, bottom: 25, height: 4, background: "#ffffff33", borderRadius: 4}}><div style={{height: "100%", background: gold, width: `${Math.min(100, frame / Math.max(1, durationInFrames - 1) * 100)}%`}}/></div>
  </AbsoluteFill>;
}
export function BhwFollowUpStory({language, beatFrames, audioSrc}: BhwFollowUpStoryProps) {
  const frames = beatFrames ?? BHW_FOLLOW_UP_BEATS.map(() => FOLLOW_UP_FPS * 12);
  return <AbsoluteFill><Series>{BHW_FOLLOW_UP_BEATS.map((beat, i) => <Series.Sequence key={beat.id} durationInFrames={frames[i]}><Scene index={i} language={language}/></Series.Sequence>)}</Series>{audioSrc && <Audio src={audioSrc}/>}</AbsoluteFill>;
}

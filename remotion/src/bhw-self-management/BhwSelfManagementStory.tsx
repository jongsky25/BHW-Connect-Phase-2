import {AbsoluteFill, Audio, Series, staticFile, type CalculateMetadataFunction} from "remotion";
import {BHW_SELF_MANAGEMENT_BEATS} from "./narration";

// Lesson 1.5.5 draft; owner review pending.
// Each language uses measured narration boundaries, including its final summary.

export const SELF_MANAGEMENT_FPS = 30;
export const SELF_MANAGEMENT_FALLBACK_DURATION = 75 * SELF_MANAGEMENT_FPS;
export type BhwSelfManagementStoryProps = {language: "fil" | "en"; beatFrames?: number[]; audioSrc?: string};
type Timings = {language: string; durationSeconds: number; beats: {zone: string; index: number; text: string; start_ms: number; end_ms: number}[]};

export const calculateBhwSelfManagementMetadata: CalculateMetadataFunction<BhwSelfManagementStoryProps> = async ({props}) => {
  const response = await fetch(staticFile(`bhw-self-management/narration-${props.language}.json`));
  if (!response.ok) throw new Error("BhwSelfManagement story requires measured narration timings");
  const timing: Timings = await response.json();
  if (timing.language !== props.language || !Number.isFinite(timing.durationSeconds) || timing.durationSeconds <= 0 ||
    timing.durationSeconds + 1.1 > 90 || timing.beats.length !== BHW_SELF_MANAGEMENT_BEATS.length ||
    timing.beats[0].start_ms !== 0 || timing.beats.some((b, i) =>
      b.zone !== BHW_SELF_MANAGEMENT_BEATS[i].id || b.index !== i || b.text !== BHW_SELF_MANAGEMENT_BEATS[i][props.language] ||
      !Number.isFinite(b.start_ms) || !Number.isFinite(b.end_ms) ||
      b.end_ms <= b.start_ms || b.end_ms > timing.durationSeconds * 1000 + 50 ||
      (i > 0 && b.start_ms < timing.beats[i - 1].end_ms)))
    throw new Error("BhwSelfManagement scene timing mismatch");
  const boundaries = [...timing.beats.map(b => b.start_ms), timing.durationSeconds * 1000 + 1100];
  const beatFrames = timing.beats.map((_, i) => Math.round(boundaries[i + 1] * SELF_MANAGEMENT_FPS / 1000) - Math.round(boundaries[i] * SELF_MANAGEMENT_FPS / 1000));
  if (beatFrames.some(n => n < 1)) throw new Error("BhwSelfManagement story has an empty scene");
  return {durationInFrames: beatFrames.reduce((sum, n) => sum + n, 0), props: {...props, beatFrames, audioSrc: staticFile(`bhw-self-management/narration-${props.language}.mp3`)}};
};

import {Scene} from "./Scene";

export function BhwSelfManagementStory({language,beatFrames,audioSrc}:BhwSelfManagementStoryProps){
 const frames=beatFrames??BHW_SELF_MANAGEMENT_BEATS.map(()=>SELF_MANAGEMENT_FPS*12);
 return <AbsoluteFill><Series>{BHW_SELF_MANAGEMENT_BEATS.map((beat,i)=><Series.Sequence key={beat.id} durationInFrames={frames[i]}><Scene index={i} language={language}/></Series.Sequence>)}</Series>{audioSrc&&<Audio src={audioSrc}/>}</AbsoluteFill>;
}

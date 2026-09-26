import "./index.css";
import { Composition } from "remotion";
import {
  HANDRUB_FALLBACK_DURATION,
  HANDRUB_FPS,
  HandrubSteps,
  calculateHandrubMetadata,
} from "./hand-hygiene/HandrubSteps";

// Compositions are authored at the lesson format (854×480, see
// scripts/remotion-render.mjs) so the render needs no scaling. One
// composition per narration language (docs/handrub-clip-enhancement-
// handoff.md §3): on-screen labels stay bilingual, only the audio track and
// the narration-derived pacing differ between the two.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HandrubStepsFil"
        component={HandrubSteps}
        calculateMetadata={calculateHandrubMetadata}
        durationInFrames={HANDRUB_FALLBACK_DURATION}
        fps={HANDRUB_FPS}
        width={854}
        height={480}
        defaultProps={{ language: "fil" }}
      />
      <Composition
        id="HandrubStepsEn"
        component={HandrubSteps}
        calculateMetadata={calculateHandrubMetadata}
        durationInFrames={HANDRUB_FALLBACK_DURATION}
        fps={HANDRUB_FPS}
        width={854}
        height={480}
        defaultProps={{ language: "en" }}
      />
    </>
  );
};

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
//
// Register a language only once its narration files (public/hand-hygiene/
// narration-<lang>.{mp3,json}) are committed: the render workflow renders
// every registered composition on every push, and Remotion fails a render
// on the browser's "failed to load resource" error for a missing file even
// though calculateHandrubMetadata catches the failed fetch in JS.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {(["fil", "en"] as const).map((language) => (
        <Composition
          key={language}
          id={language === "fil" ? "HandrubStepsFil" : "HandrubStepsEn"}
          component={HandrubSteps}
          calculateMetadata={calculateHandrubMetadata}
          durationInFrames={HANDRUB_FALLBACK_DURATION}
          fps={HANDRUB_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
    </>
  );
};

import "./index.css";
import { Composition } from "remotion";
import {
  HANDRUB_FALLBACK_DURATION,
  HANDRUB_FPS,
  HandrubSteps,
  calculateHandrubMetadata,
} from "./hand-hygiene/HandrubSteps";
import {
  RECORDS_FALLBACK_DURATION,
  RECORDS_FPS,
  RecordsStory,
  calculateRecordsMetadata,
} from "./records/RecordsStory";
import {
  SERVICE_PROVIDER_FALLBACK_DURATION,
  SERVICE_PROVIDER_FPS,
  ServiceProviderStory,
  calculateServiceProviderMetadata,
} from "./service-provider/ServiceProviderStory";

// Compositions are authored at the lesson format (854×480, see
// scripts/remotion-render.mjs) so the render needs no scaling. One
// composition per narration language (docs/narrated-lesson-video-pattern.md):
// on-screen labels stay bilingual in the summary, while the voice, scene
// pacing, and captions differ by language.
//
// Register a language only once its narration files (public/<story>/
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
      {(["fil", "en"] as const).map((language) => (
        <Composition
          key={`service-provider-${language}`}
          id={language === "fil" ? "ServiceProviderStoryFil" : "ServiceProviderStoryEn"}
          component={ServiceProviderStory}
          calculateMetadata={calculateServiceProviderMetadata}
          durationInFrames={SERVICE_PROVIDER_FALLBACK_DURATION}
          fps={SERVICE_PROVIDER_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition
          key={`records-${language}`}
          id={language === "fil" ? "RecordsStoryFil" : "RecordsStoryEn"}
          component={RecordsStory}
          calculateMetadata={calculateRecordsMetadata}
          durationInFrames={RECORDS_FALLBACK_DURATION}
          fps={RECORDS_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
    </>
  );
};

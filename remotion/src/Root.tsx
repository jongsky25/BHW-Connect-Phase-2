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
import {
  COMMUNITY_ORGANIZER_FALLBACK_DURATION,
  COMMUNITY_ORGANIZER_FPS,
  CommunityOrganizerStory,
  calculateCommunityOrganizerMetadata,
} from "./community-organizer/CommunityOrganizerStory";
import {
  HEALTH_EDUCATOR_FALLBACK_DURATION,
  HEALTH_EDUCATOR_FPS,
  HealthEducatorStory,
  calculateHealthEducatorMetadata,
} from "./health-educator/HealthEducatorStory";
import {
  ROLES_HEPO_FALLBACK_DURATION,
  ROLES_HEPO_FPS,
  RolesHepoStory,
  calculateRolesHepoMetadata,
} from "./roles-hepo/RolesHepoStory";
import {
  UHC_PURPOSE_FALLBACK_DURATION,
  UHC_PURPOSE_FPS,
  UhcPurposeStory,
  calculateUhcPurposeMetadata,
} from "./uhc-purpose/UhcPurposeStory";
import {
  PRIMARY_CARE_FALLBACK_DURATION,
  PRIMARY_CARE_FPS,
  PrimaryCareStory,
  calculatePrimaryCareMetadata,
} from "./uhc-primary-care/PrimaryCareStory";

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
      <Composition
        id="RolesHepoStoryHil"
        component={RolesHepoStory}
        calculateMetadata={calculateRolesHepoMetadata}
        durationInFrames={ROLES_HEPO_FALLBACK_DURATION}
        fps={ROLES_HEPO_FPS}
        width={854}
        height={480}
        defaultProps={{ language: "hil" }}
      />
      <Composition
        id="RolesHepoStoryCeb"
        component={RolesHepoStory}
        calculateMetadata={calculateRolesHepoMetadata}
        durationInFrames={ROLES_HEPO_FALLBACK_DURATION}
        fps={ROLES_HEPO_FPS}
        width={854}
        height={480}
        defaultProps={{ language: "ceb" }}
      />
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
          key={`roles-hepo-${language}`}
          id={language === "fil" ? "RolesHepoStoryFil" : "RolesHepoStoryEn"}
          component={RolesHepoStory}
          calculateMetadata={calculateRolesHepoMetadata}
          durationInFrames={ROLES_HEPO_FALLBACK_DURATION}
          fps={ROLES_HEPO_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition
          key={`health-educator-${language}`}
          id={language === "fil" ? "HealthEducatorStoryFil" : "HealthEducatorStoryEn"}
          component={HealthEducatorStory}
          calculateMetadata={calculateHealthEducatorMetadata}
          durationInFrames={HEALTH_EDUCATOR_FALLBACK_DURATION}
          fps={HEALTH_EDUCATOR_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition
          key={`community-organizer-${language}`}
          id={language === "fil" ? "CommunityOrganizerStoryFil" : "CommunityOrganizerStoryEn"}
          component={CommunityOrganizerStory}
          calculateMetadata={calculateCommunityOrganizerMetadata}
          durationInFrames={COMMUNITY_ORGANIZER_FALLBACK_DURATION}
          fps={COMMUNITY_ORGANIZER_FPS}
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
      {(["fil", "en"] as const).map((language) => (
        <Composition
          key={`uhc-purpose-${language}`}
          id={language === "fil" ? "UhcPurposeStoryFil" : "UhcPurposeStoryEn"}
          component={UhcPurposeStory}
          calculateMetadata={calculateUhcPurposeMetadata}
          durationInFrames={UHC_PURPOSE_FALLBACK_DURATION}
          fps={UHC_PURPOSE_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition
          key={`uhc-primary-care-${language}`}
          id={language === "fil" ? "PrimaryCareStoryFil" : "PrimaryCareStoryEn"}
          component={PrimaryCareStory}
          calculateMetadata={calculatePrimaryCareMetadata}
          durationInFrames={PRIMARY_CARE_FALLBACK_DURATION}
          fps={PRIMARY_CARE_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
    </>
  );
};

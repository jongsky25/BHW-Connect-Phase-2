import {BhwSelfManagementStory, calculateBhwSelfManagementMetadata, SELF_MANAGEMENT_FPS, SELF_MANAGEMENT_FALLBACK_DURATION} from "./bhw-self-management/BhwSelfManagementStory";
import {BhwTeamworkStory, calculateBhwTeamworkMetadata, TEAMWORK_FPS, TEAMWORK_FALLBACK_DURATION} from "./bhw-teamwork/BhwTeamworkStory";
import {BhwLocalPartnersStory, calculateBhwLocalPartnersMetadata, LOCAL_PARTNERS_FPS, LOCAL_PARTNERS_FALLBACK_DURATION} from "./bhw-local-partners/BhwLocalPartnersStory";
import {BhwBarangayPartnersStory, calculateBhwBarangayPartnersMetadata, BARANGAY_PARTNERS_FPS, BARANGAY_PARTNERS_FALLBACK_DURATION} from "./bhw-barangay-partners/BhwBarangayPartnersStory";
import {BhwRelationshipsStory, calculateBhwRelationshipsMetadata, RELATIONSHIPS_FPS, RELATIONSHIPS_FALLBACK_DURATION} from "./bhw-relationships/BhwRelationshipsStory";
import {BhwFollowUpStory, calculateBhwFollowUpMetadata, FOLLOW_UP_FPS, FOLLOW_UP_FALLBACK_DURATION} from "./bhw-follow-up/BhwFollowUpStory";
import {BhwAccreditationStory, calculateBhwAccreditationMetadata, ACCREDITATION_FPS, ACCREDITATION_FALLBACK_DURATION} from "./bhw-accreditation/BhwAccreditationStory";
import {BhwEligibilityStory, calculateBhwEligibilityMetadata, ELIGIBILITY_FPS, ELIGIBILITY_FALLBACK_DURATION} from "./bhw-eligibility/BhwEligibilityStory";
import {BhwBenefitsStory, calculateBhwBenefitsMetadata, BENEFITS_FPS, BENEFITS_FALLBACK_DURATION} from "./bhw-benefits/BhwBenefitsStory";
import {BhwLegalRoleStory, calculateBhwLegalRoleMetadata, LEGAL_ROLE_FPS, LEGAL_ROLE_FALLBACK_DURATION} from "./bhw-legal-role/BhwLegalRoleStory";
import {BhsImprovementStory, calculateBhsImprovementMetadata, IMPROVEMENT_FPS, IMPROVEMENT_FALLBACK_DURATION} from "./bhs-improvement/BhsImprovementStory";
import {BhsResourcesStory, calculateBhsResourcesMetadata, RESOURCES_FPS, RESOURCES_FALLBACK_DURATION} from "./bhs-resources/BhsResourcesStory";
import {BhsDeclineStory, calculateBhsDeclineMetadata, BHS_DECLINE_FPS, BHS_DECLINE_FALLBACK_DURATION} from "./bhs-decline/BhsDeclineStory";
import {BhsPromotionsStory, calculateBhsPromotionsMetadata, BHS_PROMOTIONS_FPS, BHS_PROMOTIONS_FALLBACK_DURATION} from "./bhs-promotions/BhsPromotionsStory";
import {LocalSystemStory, calculateLocalSystemMetadata, LOCAL_SYSTEM_FPS, LOCAL_SYSTEM_FALLBACK_DURATION} from "./uhc-local-system/LocalSystemStory";
import "./index.css";
import {EnvironmentStory, calculateEnvironmentMetadata, ENVIRONMENT_FPS, ENVIRONMENT_FALLBACK_DURATION} from "./bhs-support-environment/EnvironmentStory";
import { ImprovementStory, calculateImprovementMetadata, UHC_IMPROVEMENT_FPS, UHC_IMPROVEMENT_FALLBACK_DURATION } from "./uhc-improvement/ImprovementStory";
import { RolesApplicationStory, calculateRolesApplicationMetadata, ROLES_APPLICATION_FPS, ROLES_APPLICATION_FALLBACK_DURATION } from "./roles-application/RolesApplicationStory";
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
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhs-support-environment-${language}`} id={language === "fil" ? "BhsSupportEnvironmentStoryFil" : "BhsSupportEnvironmentStoryEn"}
          component={EnvironmentStory} calculateMetadata={calculateEnvironmentMetadata}
          durationInFrames={ENVIRONMENT_FALLBACK_DURATION} fps={ENVIRONMENT_FPS}
          width={854} height={480} defaultProps={{language}} />
      ))}
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
      {(["ceb", "hil"] as const).map((language) => (
        <Composition
          key={`service-provider-${language}`}
          id={language === "ceb" ? "ServiceProviderStoryCeb" : "ServiceProviderStoryHil"}
          component={ServiceProviderStory}
          calculateMetadata={calculateServiceProviderMetadata}
          durationInFrames={SERVICE_PROVIDER_FALLBACK_DURATION}
          fps={SERVICE_PROVIDER_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
      {(["ceb", "hil"] as const).map((language) => (
        <Composition
          key={`community-organizer-${language}`}
          id={language === "ceb" ? "CommunityOrganizerStoryCeb" : "CommunityOrganizerStoryHil"}
          component={CommunityOrganizerStory}
          calculateMetadata={calculateCommunityOrganizerMetadata}
          durationInFrames={COMMUNITY_ORGANIZER_FALLBACK_DURATION}
          fps={COMMUNITY_ORGANIZER_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
      {(["ceb", "hil"] as const).map((language) => (
        <Composition
          key={`health-educator-${language}`}
          id={language === "ceb" ? "HealthEducatorStoryCeb" : "HealthEducatorStoryHil"}
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
      {(["fil", "en", "ceb", "hil"] as const).map((language) => (
        <Composition
          key={`records-${language}`}
          id={{ fil: "RecordsStoryFil", en: "RecordsStoryEn", ceb: "RecordsStoryCeb", hil: "RecordsStoryHil" }[language]}
          component={RecordsStory}
          calculateMetadata={calculateRecordsMetadata}
          durationInFrames={RECORDS_FALLBACK_DURATION}
          fps={RECORDS_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
      {(["fil", "en", "ceb", "hil"] as const).map((language) => (
        <Composition
          key={`uhc-purpose-${language}`}
          id={`UhcPurposeStory${{ fil: "Fil", en: "En", ceb: "Ceb", hil: "Hil" }[language]}`}
          component={UhcPurposeStory}
          calculateMetadata={calculateUhcPurposeMetadata}
          durationInFrames={UHC_PURPOSE_FALLBACK_DURATION}
          fps={UHC_PURPOSE_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
        {(["fil", "en", "ceb", "hil"] as const).map((language) => (
          <Composition
            key={`uhc-primary-care-${language}`}
            id={({ fil: "PrimaryCareStoryFil", en: "PrimaryCareStoryEn", ceb: "PrimaryCareStoryCeb", hil: "PrimaryCareStoryHil" })[language]}
          component={PrimaryCareStory}
          calculateMetadata={calculatePrimaryCareMetadata}
          durationInFrames={PRIMARY_CARE_FALLBACK_DURATION}
          fps={PRIMARY_CARE_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
      {(["fil", "en", "ceb", "hil"] as const).map((language) => (
        <Composition
          key={`roles-application-${language}`}
          id={({ fil: "RolesApplicationStoryFil", en: "RolesApplicationStoryEn", ceb: "RolesApplicationStoryCeb", hil: "RolesApplicationStoryHil" })[language]}
          component={RolesApplicationStory}
          calculateMetadata={calculateRolesApplicationMetadata}
          durationInFrames={ROLES_APPLICATION_FALLBACK_DURATION}
          fps={ROLES_APPLICATION_FPS}
          width={854}
          height={480}
          defaultProps={{ language }}
        />
      ))}
        {(["fil", "en", "ceb", "hil"] as const).map((language) => (
          <Composition key={`uhc-local-system-${language}`} id={{fil: "LocalSystemStoryFil", en: "LocalSystemStoryEn", ceb: "LocalSystemStoryCeb", hil: "LocalSystemStoryHil"}[language]}
          component={LocalSystemStory} calculateMetadata={calculateLocalSystemMetadata}
          durationInFrames={LOCAL_SYSTEM_FALLBACK_DURATION} fps={LOCAL_SYSTEM_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhs-promotions-${language}`} id={language === "fil" ? "BhsPromotionsStoryFil" : "BhsPromotionsStoryEn"}
          component={BhsPromotionsStory} calculateMetadata={calculateBhsPromotionsMetadata}
          durationInFrames={BHS_PROMOTIONS_FALLBACK_DURATION} fps={BHS_PROMOTIONS_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en", "ceb", "hil"] as const).map((language) => (
        <Composition key={`uhc-improvement-${language}`} id={language === "fil" ? "UhcImprovementStoryFil" : language === "ceb" ? "UhcImprovementStoryCeb" : language === "hil" ? "UhcImprovementStoryHil" : "UhcImprovementStoryEn"}
          component={ImprovementStory} calculateMetadata={calculateImprovementMetadata}
          durationInFrames={UHC_IMPROVEMENT_FALLBACK_DURATION} fps={UHC_IMPROVEMENT_FPS}
          width={854} height={480} defaultProps={{ language }} />
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhs-decline-${language}`} id={language === "fil" ? "BhsDeclineStoryFil" : "BhsDeclineStoryEn"}
          component={BhsDeclineStory} calculateMetadata={calculateBhsDeclineMetadata}
          durationInFrames={BHS_DECLINE_FALLBACK_DURATION} fps={BHS_DECLINE_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhs-resources-${language}`} id={language === "fil" ? "BhsResourcesStoryFil" : "BhsResourcesStoryEn"}
          component={BhsResourcesStory} calculateMetadata={calculateBhsResourcesMetadata}
          durationInFrames={RESOURCES_FALLBACK_DURATION} fps={RESOURCES_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhs-improvement-${language}`} id={language === "fil" ? "BhsImprovementStoryFil" : "BhsImprovementStoryEn"}
          component={BhsImprovementStory} calculateMetadata={calculateBhsImprovementMetadata}
          durationInFrames={IMPROVEMENT_FALLBACK_DURATION} fps={IMPROVEMENT_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhw-legal-role-${language}`} id={language === "fil" ? "BhwLegalRoleStoryFil" : "BhwLegalRoleStoryEn"}
          component={BhwLegalRoleStory} calculateMetadata={calculateBhwLegalRoleMetadata}
          durationInFrames={LEGAL_ROLE_FALLBACK_DURATION} fps={LEGAL_ROLE_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhw-benefits-${language}`} id={language === "fil" ? "BhwBenefitsStoryFil" : "BhwBenefitsStoryEn"}
          component={BhwBenefitsStory} calculateMetadata={calculateBhwBenefitsMetadata}
          durationInFrames={BENEFITS_FALLBACK_DURATION} fps={BENEFITS_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhw-eligibility-${language}`} id={language === "fil" ? "BhwEligibilityStoryFil" : "BhwEligibilityStoryEn"}
          component={BhwEligibilityStory} calculateMetadata={calculateBhwEligibilityMetadata}
          durationInFrames={ELIGIBILITY_FALLBACK_DURATION} fps={ELIGIBILITY_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhw-accreditation-${language}`} id={language === "fil" ? "BhwAccreditationStoryFil" : "BhwAccreditationStoryEn"}
          component={BhwAccreditationStory} calculateMetadata={calculateBhwAccreditationMetadata}
          durationInFrames={ACCREDITATION_FALLBACK_DURATION} fps={ACCREDITATION_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhw-follow-up-${language}`} id={language === "fil" ? "BhwFollowUpStoryFil" : "BhwFollowUpStoryEn"}
          component={BhwFollowUpStory} calculateMetadata={calculateBhwFollowUpMetadata}
          durationInFrames={FOLLOW_UP_FALLBACK_DURATION} fps={FOLLOW_UP_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhw-relationships-${language}`} id={language === "fil" ? "BhwRelationshipsStoryFil" : "BhwRelationshipsStoryEn"}
          component={BhwRelationshipsStory} calculateMetadata={calculateBhwRelationshipsMetadata}
          durationInFrames={RELATIONSHIPS_FALLBACK_DURATION} fps={RELATIONSHIPS_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhw-barangay-partners-${language}`} id={language === "fil" ? "BhwBarangayPartnersStoryFil" : "BhwBarangayPartnersStoryEn"}
          component={BhwBarangayPartnersStory} calculateMetadata={calculateBhwBarangayPartnersMetadata}
          durationInFrames={BARANGAY_PARTNERS_FALLBACK_DURATION} fps={BARANGAY_PARTNERS_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhw-local-partners-${language}`} id={language === "fil" ? "BhwLocalPartnersStoryFil" : "BhwLocalPartnersStoryEn"}
          component={BhwLocalPartnersStory} calculateMetadata={calculateBhwLocalPartnersMetadata}
          durationInFrames={LOCAL_PARTNERS_FALLBACK_DURATION} fps={LOCAL_PARTNERS_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhw-teamwork-${language}`} id={language === "fil" ? "BhwTeamworkStoryFil" : "BhwTeamworkStoryEn"}
          component={BhwTeamworkStory} calculateMetadata={calculateBhwTeamworkMetadata}
          durationInFrames={TEAMWORK_FALLBACK_DURATION} fps={TEAMWORK_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
      {(["fil", "en"] as const).map((language) => (
        <Composition key={`bhw-self-management-${language}`} id={language === "fil" ? "BhwSelfManagementStoryFil" : "BhwSelfManagementStoryEn"}
          component={BhwSelfManagementStory} calculateMetadata={calculateBhwSelfManagementMetadata}
          durationInFrames={SELF_MANAGEMENT_FALLBACK_DURATION} fps={SELF_MANAGEMENT_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
    </>
  );
};

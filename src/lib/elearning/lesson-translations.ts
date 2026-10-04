import coverageCebuano from "../../../content/training/day1-basic-competencies/modules/02-uhc-act/lessons/uhc-coverage/pilot.ceb.json";
import coverageHiligaynon from "../../../content/training/day1-basic-competencies/modules/02-uhc-act/lessons/uhc-coverage/pilot.hil.json";
import pilot from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-hepo/pilot.ceb.json";
import hiligaynon from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-hepo/pilot.hil.json";
import educatorCebuano from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-health-educator/pilot.ceb.json";
import educatorHiligaynon from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-health-educator/pilot.hil.json";
import organizerCebuano from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-community-organizer/pilot.ceb.json";
import organizerHiligaynon from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-community-organizer/pilot.hil.json";
import providerCebuano from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-service-provider/pilot.ceb.json";
import providerHiligaynon from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-service-provider/pilot.hil.json";
import recordsCebuano from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-records/pilot.ceb.json";
import recordsHiligaynon from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-records/pilot.hil.json";
import applicationCebuano from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-application/pilot.ceb.json";
import applicationHiligaynon from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-application/pilot.hil.json";
import { translationMatchesLesson, type LessonTranslation } from "./lesson-translation";
import type { PublishedLesson } from "./reference-navigation";

// Only the lesson being opened is serialized to the client. Draft language
// content is available in the existing staff preview, never to learners.
export function translationsForLesson(lesson: PublishedLesson, preview: boolean): LessonTranslation[] {
  return ([coverageCebuano, coverageHiligaynon, pilot, hiligaynon, educatorCebuano, educatorHiligaynon, organizerCebuano, organizerHiligaynon, providerCebuano, providerHiligaynon, recordsCebuano, recordsHiligaynon, applicationCebuano, applicationHiligaynon] as LessonTranslation[]).filter(translation =>
    (preview || translation.review_status === "approved") && translationMatchesLesson(lesson, translation));
}

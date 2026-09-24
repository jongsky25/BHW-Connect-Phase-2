import module1 from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/qa-entries.json";
import module2 from "../../../content/training/day1-basic-competencies/modules/02-uhc-act/qa-entries.json";
import module3 from "../../../content/training/day1-basic-competencies/modules/03-polisiya-bhs/qa-entries.json";
import module4 from "../../../content/training/day1-basic-competencies/modules/04-ra7883/qa-entries.json";
import module5 from "../../../content/training/day1-basic-competencies/modules/05-bhw-at-barangay/qa-entries.json";
import module6 from "../../../content/training/day1-basic-competencies/modules/06-komunikasyon/qa-entries.json";
import module7 from "../../../content/training/day1-basic-competencies/modules/07-problema/qa-entries.json";
import module8 from "../../../content/training/day1-basic-competencies/modules/08-osh/qa-entries.json";
import module9 from "../../../content/training/day1-basic-competencies/modules/09-sustainable-practices/qa-entries.json";
import type { ChatFixture } from "./fixtures";
import type { ChatEntryCandidate } from "./types";

// Real source files, not invented candidate answers. UUIDs remain distinct
// from content IDs, as in ncd-fixtures.ts. This models reviewed publication;
// it does not assert that these draft entries are already live.
export const trainingKbEntries: ChatEntryCandidate[] = [
  module1, module2, module3, module4, module5, module6, module7, module8, module9,
].flatMap((file) => file.entries).filter((entry) => entry.tier === "cited")
  .map((entry, index) => ({
    id: `00000000-0000-4001-8000-${String(index).padStart(12, "0")}`,
    content_id: entry.id,
    question_fil: entry.question_fil,
    question_en: entry.question_en,
    answer_fil: entry.answer_fil,
    answer_en: entry.answer_en,
    keywords: entry.keywords,
  }));

// Independent user phrasings; do not generate queries from entry keywords.
export const trainingCorpusFixtures: ChatFixture[] = [
  {
    "id": "day1-1-fil-0",
    "language": "fil",
    "question": "ano ang tungkulin ng BHW",
    "expected": {
      "type": "answer",
      "entryId": "d1m1-three-roles"
    }
  },
  {
    "id": "day1-1-en-1",
    "language": "en",
    "question": "What does a BHW do as a health educator?",
    "expected": {
      "type": "answer",
      "entryId": "d1m1-health-educator"
    }
  },
  {
    "id": "day1-1-taglish-2",
    "language": "taglish",
    "question": "Ano meaning ng HEPO?",
    "expected": {
      "type": "answer",
      "entryId": "d1m1-hepo"
    }
  },
  {
    "id": "day1-2-fil-3",
    "language": "fil",
    "question": "Ano ang UHC Act?",
    "expected": {
      "type": "answer",
      "entryId": "d1m2-what-is-uhc"
    }
  },
  {
    "id": "day1-2-en-4",
    "language": "en",
    "question": "What is a primary care provider?",
    "expected": {
      "type": "answer",
      "entryId": "d1m2-primary-care-provider"
    }
  },
  {
    "id": "day1-2-taglish-5",
    "language": "taglish",
    "question": "Ano binago sa referral system under UHC?",
    "expected": {
      "type": "answer",
      "entryId": "d1m2-referral-system"
    }
  },
  {
    "id": "day1-3-fil-6",
    "language": "fil",
    "question": "Puwede bang magpromote ng gatas sa barangay health station?",
    "expected": {
      "type": "answer",
      "entryId": "d1m3-milk-code"
    }
  },
  {
    "id": "day1-3-en-7",
    "language": "en",
    "question": "What does RA 10028 require?",
    "expected": {
      "type": "answer",
      "entryId": "d1m3-breastfeeding-act"
    }
  },
  {
    "id": "day1-3-taglish-8",
    "language": "taglish",
    "question": "Paano mag-decline ng gift kapalit ng product promotion?",
    "expected": {
      "type": "answer",
      "entryId": "d1m3-decline-gift"
    }
  },
  {
    "id": "day1-4-fil-9",
    "language": "fil",
    "question": "Sino ang nag-aakredita sa BHW?",
    "expected": {
      "type": "answer",
      "entryId": "d1m4-accreditation"
    }
  },
  {
    "id": "day1-4-en-10",
    "language": "en",
    "question": "What benefits does RA 7883 provide for BHWs?",
    "expected": {
      "type": "answer",
      "entryId": "d1m4-benefits"
    }
  },
  {
    "id": "day1-4-taglish-11",
    "language": "taglish",
    "question": "Ano requirements ng BHWE civil service eligibility?",
    "expected": {
      "type": "answer",
      "entryId": "d1m4-bhwe"
    }
  },
  {
    "id": "day1-5-fil-12",
    "language": "fil",
    "question": "Ano ang apat na ugnayan ng BHW?",
    "expected": {
      "type": "answer",
      "entryId": "d1m5-four-relationships"
    }
  },
  {
    "id": "day1-5-en-13",
    "language": "en",
    "question": "Who is on the local health board?",
    "expected": {
      "type": "answer",
      "entryId": "d1m5-local-health-board-composition"
    }
  },
  {
    "id": "day1-5-taglish-14",
    "language": "taglish",
    "question": "Ano ang good teamwork practices ng BHW?",
    "expected": {
      "type": "answer",
      "entryId": "d1m5-teamwork-practices"
    }
  },
  {
    "id": "day1-6-fil-15",
    "language": "fil",
    "question": "Paano gumamit ng bukas na tanong sa interview?",
    "expected": {
      "type": "answer",
      "entryId": "d1m6-open-questions"
    }
  },
  {
    "id": "day1-6-en-16",
    "language": "en",
    "question": "How should gathered information be verified?",
    "expected": {
      "type": "answer",
      "entryId": "d1m6-verify-information"
    }
  },
  {
    "id": "day1-6-taglish-17",
    "language": "taglish",
    "question": "Paano gumawa ng short report after household interview?",
    "expected": {
      "type": "answer",
      "entryId": "d1m6-present-information"
    }
  },
  {
    "id": "day1-6-fil-18",
    "language": "fil",
    "question": "Paano gumamit ng balik-paliwanag para sa susunod na hakbang?",
    "expected": {
      "type": "answer",
      "entryId": "d1m6-teach-back"
    }
  },
  {
    "id": "day1-7-fil-19",
    "language": "fil",
    "question": "Paano ang limang bakit sa paghanap ng ugat ng problema?",
    "expected": {
      "type": "answer",
      "entryId": "d1m7-five-whys"
    }
  },
  {
    "id": "day1-7-en-20",
    "language": "en",
    "question": "What are the four priority criteria for barangay problems?",
    "expected": {
      "type": "answer",
      "entryId": "d1m7-priority-criteria"
    }
  },
  {
    "id": "day1-7-taglish-21",
    "language": "taglish",
    "question": "Ano dapat laman ng action plan sa barangay?",
    "expected": {
      "type": "answer",
      "entryId": "d1m7-action-plan"
    }
  },
  {
    "id": "day1-7-fil-22",
    "language": "fil",
    "question": "Ano ang aral ng kwento ni Rosario?",
    "expected": {
      "type": "answer",
      "entryId": "d1m7-rosario"
    }
  },
  {
    "id": "day1-8-fil-23",
    "language": "fil",
    "question": "Ano ihahanda para sa ligtas na trabaho ng BHW?",
    "expected": {
      "type": "answer",
      "entryId": "d1m8-safety-preparation"
    }
  },
  {
    "id": "day1-8-en-24",
    "language": "en",
    "question": "How can I manage excessive workload as a volunteer?",
    "expected": {
      "type": "answer",
      "entryId": "d1m8-workload-boundaries"
    }
  },
  {
    "id": "day1-8-taglish-25",
    "language": "taglish",
    "question": "Ano ang hazards sa household visit at paano maghanda?",
    "expected": {
      "type": "answer",
      "entryId": "d1m8-field-hazards"
    }
  },
  {
    "id": "day1-8-en-26",
    "language": "en",
    "question": "What infection prevention is needed at the BHS?",
    "expected": {
      "type": "answer",
      "entryId": "d1m8-infection-controls"
    }
  },
  {
    "id": "day1-9-fil-27",
    "language": "fil",
    "question": "Paano magtipid ng tubig at kuryente sa BHS?",
    "expected": {
      "type": "answer",
      "entryId": "d1m9-resource-saving"
    }
  },
  {
    "id": "day1-9-en-28",
    "language": "en",
    "question": "How do we avoid duplicate supply orders?",
    "expected": {
      "type": "answer",
      "entryId": "d1m9-stock-routine"
    }
  },
  {
    "id": "day1-9-taglish-29",
    "language": "taglish",
    "question": "Paano sukatin ang resource-saving routine at quality?",
    "expected": {
      "type": "answer",
      "entryId": "d1m9-measure-improvement"
    }
  },
  {
    "id": "day1-9-en-30",
    "language": "en",
    "question": "What reusable material can we use for health teaching?",
    "expected": {
      "type": "answer",
      "entryId": "d1m9-safe-reuse"
    }
  }
];

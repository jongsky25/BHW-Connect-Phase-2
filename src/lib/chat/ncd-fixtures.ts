import module1 from "../../../content/kb/hhp-ncd/entries/module-1.json";
import module2 from "../../../content/kb/hhp-ncd/entries/module-2.json";
import module3 from "../../../content/kb/hhp-ncd/entries/module-3.json";
import module4 from "../../../content/kb/hhp-ncd/entries/module-4.json";
import module5 from "../../../content/kb/hhp-ncd/entries/module-5.json";
import module6 from "../../../content/kb/hhp-ncd/entries/module-6.json";
import synonymsFile from "../../../content/kb/hhp-ncd/synonyms.json";
import type { ChatFixture } from "./fixtures";
import type { ChatEntryCandidate, SynonymRow } from "./types";

// Unlike fixtures.ts — which is invented Maternal & Child Health mock data —
// this corpus is generated from the real content files under content/kb/hhp-ncd
// that scripts/kb-load.mjs pushes to the pilot project. The test and the loaded
// corpus therefore cannot drift: editing an entry's question or keywords
// re-runs the matcher against the same text a BHW will actually be matched on.
//
// Only `cited` entries appear here, because `pending` ones are loaded as drafts
// and /api/chat selects `status = 'published'` — the retrieval problem the
// matcher really faces is the published subset, not the whole file.

type ContentEntry = {
  id: string;
  tier: string;
  question_en: string;
  question_fil: string;
  answer_en: string;
  answer_fil: string;
  keywords: string[];
};

const modules = [module1, module2, module3, module4, module5, module6];

// `id` is deliberately a synthetic uuid, NOT the content id, because that is
// what the corpus looks like once it is in Postgres — kb_entries.id is
// generated per project. An earlier version of this file used the content id
// as `id`, which made the conversation layer's rule lookups pass in tests and
// silently miss every time in production (INC-17b). Keeping the two distinct
// here is the regression guard: any code that keys rules off `id` now fails.
function syntheticUuid(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

export const ncdKbEntries: ChatEntryCandidate[] = modules
  .flatMap((file) => file.entries as ContentEntry[])
  .filter((entry) => entry.tier === "cited")
  .map((entry, index) => ({
    id: syntheticUuid(index),
    content_id: entry.id,
    question_en: entry.question_en,
    question_fil: entry.question_fil,
    answer_en: entry.answer_en,
    answer_fil: entry.answer_fil,
    keywords: entry.keywords,
  }));

export const ncdSynonyms: SynonymRow[] = synonymsFile.synonyms as SynonymRow[];

// Re-exported from the runtime module so the corpus tests score against the
// exact rules /api/chat loads, the same way ncdKbEntries mirrors the entries
// the loader publishes.
export { clarifierRules as ncdClarifiers, redFlagRules as ncdRedFlags } from "./rules";

// 30 English / 30 Filipino / 30 Taglish-Hiligaynon-misspelled, each asserting
// the specific entry that must win — not merely that something came back.
export const ncdCorpusFixtures: ChatFixture[] = [
  // --- English (30) ---
  { id: "ncd-en-1", language: "en", question: "How long should someone rest before I take their blood pressure?", expected: { type: "answer", entryId: "m3-rest-before" } },
  { id: "ncd-en-2", language: "en", question: "What size BP cuff should I use for a large arm?", expected: { type: "answer", entryId: "m3-cuff-size" } },
  { id: "ncd-en-3", language: "en", question: "Where should the arm rest when measuring blood pressure?", expected: { type: "answer", entryId: "m3-arm-at-heart-level" } },
  { id: "ncd-en-4", language: "en", question: "Can I put the cuff over the sleeve?", expected: { type: "answer", entryId: "m3-bare-arm" } },
  { id: "ncd-en-5", language: "en", question: "Which arm should I use for the blood pressure measurement?", expected: { type: "answer", entryId: "m3-which-arm" } },
  { id: "ncd-en-6", language: "en", question: "Can we talk while the blood pressure is being taken?", expected: { type: "answer", entryId: "m3-no-talking" } },
  { id: "ncd-en-7", language: "en", question: "Can I round the blood pressure reading when writing it down?", expected: { type: "answer", entryId: "m3-rounding" } },
  { id: "ncd-en-8", language: "en", question: "What are the most common blood pressure measurement errors?", expected: { type: "answer", entryId: "m3-common-errors" } },
  { id: "ncd-en-9", language: "en", question: "What kind of blood pressure device should we use?", expected: { type: "answer", entryId: "m3-validated-device" } },
  { id: "ncd-en-10", language: "en", question: "What is the difference between screening and diagnosis?", expected: { type: "answer", entryId: "m1-screening-vs-diagnosis" } },
  { id: "ncd-en-11", language: "en", question: "What is PhilPEN?", expected: { type: "answer", entryId: "m1-what-is-philpen" } },
  { id: "ncd-en-12", language: "en", question: "What is the Healthy Hearts Plus programme?", expected: { type: "answer", entryId: "m1-what-is-hhp" } },
  { id: "ncd-en-13", language: "en", question: "Where do I refer a client I have screened?", expected: { type: "answer", entryId: "m1-referral-destination" } },
  { id: "ncd-en-14", language: "en", question: "What if the client refuses to go to the health centre?", expected: { type: "answer", entryId: "m1-client-refuses-referral" } },
  { id: "ncd-en-15", language: "en", question: "Can I share a resident's screening result with their neighbours?", expected: { type: "answer", entryId: "m1-confidentiality" } },
  { id: "ncd-en-16", language: "en", question: "What information does the risk assessment form collect?", expected: { type: "answer", entryId: "m2-raf-contents" } },
  { id: "ncd-en-17", language: "en", question: "How do I ask about smoking without offending the client?", expected: { type: "answer", entryId: "m2-ask-smoking" } },
  { id: "ncd-en-18", language: "en", question: "How do I ask about alcohol use?", expected: { type: "answer", entryId: "m2-ask-alcohol" } },
  { id: "ncd-en-19", language: "en", question: "Which symptoms should I screen for during the assessment?", expected: { type: "answer", entryId: "m2-symptom-screening" } },
  { id: "ncd-en-20", language: "en", question: "Which findings need immediate referral?", expected: { type: "answer", entryId: "m2-red-flags-immediate" } },
  { id: "ncd-en-21", language: "en", question: "What information should go on the referral slip?", expected: { type: "answer", entryId: "m2-two-way-referral-info" } },
  { id: "ncd-en-22", language: "en", question: "What is capillary blood glucose testing?", expected: { type: "answer", entryId: "m4-what-is-cbg" } },
  { id: "ncd-en-23", language: "en", question: "What is the difference between fasting and random blood sugar?", expected: { type: "answer", entryId: "m4-fbs-vs-rbs" } },
  { id: "ncd-en-24", language: "en", question: "Can a lancet be used more than once?", expected: { type: "answer", entryId: "m4-single-use-lancet" } },
  { id: "ncd-en-25", language: "en", question: "Which finger should I prick?", expected: { type: "answer", entryId: "m4-site-selection" } },
  { id: "ncd-en-26", language: "en", question: "Should I use the first drop of blood?", expected: { type: "answer", entryId: "m4-first-drop" } },
  { id: "ncd-en-27", language: "en", question: "Where do I put the used lancet?", expected: { type: "answer", entryId: "m4-sharps-disposal" } },
  { id: "ncd-en-28", language: "en", question: "What do I do if I prick myself with a used lancet?", expected: { type: "answer", entryId: "m4-needlestick" } },
  { id: "ncd-en-29", language: "en", question: "What are the signs of low blood sugar?", expected: { type: "answer", entryId: "m4-hypoglycemia" } },
  { id: "ncd-en-30", language: "en", question: "How do I check that the client understood?", expected: { type: "answer", entryId: "m5-teach-back" } },

  // --- Filipino (30) ---
  { id: "ncd-fil-1", language: "fil", question: "Gaano katagal dapat magpahinga bago sukatin ang presyon?", expected: { type: "answer", entryId: "m3-rest-before" } },
  { id: "ncd-fil-2", language: "fil", question: "Paano ko malalaman kung tama ang laki ng cuff?", expected: { type: "answer", entryId: "m3-cuff-size" } },
  { id: "ncd-fil-3", language: "fil", question: "Saan dapat nakapatong ang braso habang sinusukat?", expected: { type: "answer", entryId: "m3-arm-at-heart-level" } },
  { id: "ncd-fil-4", language: "fil", question: "Aling braso ang gagamitin sa pagsukat?", expected: { type: "answer", entryId: "m3-which-arm" } },
  { id: "ncd-fil-5", language: "fil", question: "Ano ang ibig sabihin ng systolic at diastolic?", expected: { type: "answer", entryId: "m3-what-numbers-mean" } },
  { id: "ncd-fil-6", language: "fil", question: "Paano kung mababa ang resulta ng presyon?", expected: { type: "answer", entryId: "m3-low-reading" } },
  { id: "ncd-fil-7", language: "fil", question: "Paano ko aalagaan ang aparato sa presyon?", expected: { type: "answer", entryId: "m3-device-care" } },
  { id: "ncd-fil-8", language: "fil", question: "Paano ako makakasukat kung maraming tao sa aktibidad?", expected: { type: "answer", entryId: "m3-noisy-place" } },
  { id: "ncd-fil-9", language: "fil", question: "Ano ang altapresyon?", expected: { type: "answer", entryId: "m1-hypertension-definition" } },
  { id: "ncd-fil-10", language: "fil", question: "Ano ang type 2 diabetes?", expected: { type: "answer", entryId: "m1-diabetes-definition" } },
  { id: "ncd-fil-11", language: "fil", question: "Ano ang saklaw ng gawain ko bilang BHW?", expected: { type: "answer", entryId: "m1-bhw-scope" } },
  { id: "ncd-fil-12", language: "fil", question: "Kailan ito emergency at hindi na screening?", expected: { type: "answer", entryId: "m1-emergency-not-screening" } },
  { id: "ncd-fil-13", language: "fil", question: "Ano ang papel ko pagkatapos magsimula ng gamutan?", expected: { type: "answer", entryId: "m1-role-in-adherence" } },
  { id: "ncd-fil-14", language: "fil", question: "Ano ang NCD flipchart at para saan ito?", expected: { type: "answer", entryId: "m2-what-is-flipchart" } },
  { id: "ncd-fil-15", language: "fil", question: "Paano ko itatanong ang kasaysayan ng sakit sa pamilya?", expected: { type: "answer", entryId: "m2-family-history" } },
  { id: "ncd-fil-16", language: "fil", question: "Ano ang itatanong ko tungkol sa pagkain?", expected: { type: "answer", entryId: "m2-ask-diet" } },
  { id: "ncd-fil-17", language: "fil", question: "Paano kung ayaw sagutin ang sensitibong tanong?", expected: { type: "answer", entryId: "m2-client-refuses-question" } },
  { id: "ncd-fil-18", language: "fil", question: "Kailan ko isusulat ang mga sagot sa form?", expected: { type: "answer", entryId: "m2-record-immediately" } },
  { id: "ncd-fil-19", language: "fil", question: "Kailangan ba ng guwantes sa pagtusok sa daliri?", expected: { type: "answer", entryId: "m4-gloves" } },
  { id: "ncd-fil-20", language: "fil", question: "Kailan ako maghuhugas ng kamay sa pagsusuri?", expected: { type: "answer", entryId: "m4-hand-hygiene" } },
  { id: "ncd-fil-21", language: "fil", question: "Paano ko lilinisin ang daliri bago tumusok?", expected: { type: "answer", entryId: "m4-disinfect-site" } },
  { id: "ncd-fil-22", language: "fil", question: "Pwede ko bang pigain ang daliri para makakuha ng dugo?", expected: { type: "answer", entryId: "m4-no-milking" } },
  { id: "ncd-fil-23", language: "fil", question: "Paano ko itatago ang mga test strip?", expected: { type: "answer", entryId: "m4-strip-handling" } },
  { id: "ncd-fil-24", language: "fil", question: "Ano ang isusulat ko pagkatapos ng pagsusuri ng asukal?", expected: { type: "answer", entryId: "m4-record-glucose" } },
  { id: "ncd-fil-25", language: "fil", question: "Paano ko ipapaliwanag ang mataas na resulta nang hindi natatakot?", expected: { type: "answer", entryId: "m5-explain-high-result" } },
  { id: "ncd-fil-26", language: "fil", question: "Ano ang sasabihin ko kung normal ang resulta?", expected: { type: "answer", entryId: "m5-explain-normal-result" } },
  { id: "ncd-fil-27", language: "fil", question: "Ano ang motivational interviewing?", expected: { type: "answer", entryId: "m5-what-is-mi" } },
  { id: "ncd-fil-28", language: "fil", question: "Ano ang nilalaman ng screening register?", expected: { type: "answer", entryId: "m6-register-contents" } },
  { id: "ncd-fil-29", language: "fil", question: "Paano ko itatama ang mali sa talaan?", expected: { type: "answer", entryId: "m6-correcting-errors" } },
  { id: "ncd-fil-30", language: "fil", question: "Saan ko itatago ang mga talaan ng screening?", expected: { type: "answer", entryId: "m6-record-security" } },

  // --- Taglish, Hiligaynon and misspellings (30) ---
  { id: "ncd-tag-1", language: "taglish", question: "pila ka minuto dapat magpahinga bago mag bp?", expected: { type: "answer", entryId: "m3-rest-before" } },
  { id: "ncd-tag-2", language: "taglish", question: "dako ang butkon, tama pa ba ang cuff size?", expected: { type: "answer", entryId: "m3-cuff-size" } },
  { id: "ncd-tag-3", language: "taglish", question: "dapat ba nakapatong sa mesa ang butkon pag nag bp", expected: { type: "answer", entryId: "m3-arm-at-heart-level" } },
  { id: "ncd-tag-4", language: "taglish", question: "pwede ba ilagay ang cuff sa ibabaw ng manggas", expected: { type: "answer", entryId: "m3-bare-arm" } },
  { id: "ncd-tag-5", language: "taglish", question: "ok lang ba mag round ng bp reading", expected: { type: "answer", entryId: "m3-rounding" } },
  { id: "ncd-tag-6", language: "taglish", question: "anong aparato ang pwede, yung sa wrist ba", expected: { type: "answer", entryId: "m3-validated-device" } },
  { id: "ncd-tag-7", language: "taglish", question: "ano ang hypertention", expected: { type: "answer", entryId: "m1-hypertension-definition" } },
  { id: "ncd-tag-8", language: "taglish", question: "ano ang dyabetis type 2", expected: { type: "answer", entryId: "m1-diabetes-definition" } },
  { id: "ncd-tag-9", language: "taglish", question: "pwede ba ako mag diagnose ng diabetes", expected: { type: "answer", entryId: "m1-screening-vs-diagnosis" } },
  { id: "ncd-tag-10", language: "taglish", question: "san ko dadalhin yung na screen ko", expected: { type: "answer", entryId: "m1-referral-destination" } },
  { id: "ncd-tag-11", language: "taglish", question: "ayaw magpa check up sa health center, ano gagawin", expected: { type: "answer", entryId: "m1-client-refuses-referral" } },
  { id: "ncd-tag-12", language: "taglish", question: "pwede ko ba sabihin sa kapitbahay ang resulta", expected: { type: "answer", entryId: "m1-confidentiality" } },
  { id: "ncd-tag-13", language: "taglish", question: "nakakahiya itanong ang sigarilyo, paano", expected: { type: "answer", entryId: "m2-ask-smoking" } },
  { id: "ncd-tag-14", language: "taglish", question: "ano ang laman ng raf form", expected: { type: "answer", entryId: "m2-raf-contents" } },
  { id: "ncd-tag-15", language: "taglish", question: "anong sintomas ang kailangan agad i refer", expected: { type: "answer", entryId: "m2-red-flags-immediate" } },
  { id: "ncd-tag-16", language: "taglish", question: "ano ilalagay sa referral slip", expected: { type: "answer", entryId: "m2-two-way-referral-info" } },
  { id: "ncd-tag-17", language: "taglish", question: "ano ang cbg", expected: { type: "answer", entryId: "m4-what-is-cbg" } },
  { id: "ncd-tag-18", language: "taglish", question: "ano difference ng fbs at rbs", expected: { type: "answer", entryId: "m4-fbs-vs-rbs" } },
  { id: "ncd-tag-19", language: "taglish", question: "pwede ba i reuse ang lancet sa parehong tao", expected: { type: "answer", entryId: "m4-single-use-lancet" } },
  { id: "ncd-tag-20", language: "taglish", question: "aling tudlo ang tutusukin ko", expected: { type: "answer", entryId: "m4-site-selection" } },
  { id: "ncd-tag-21", language: "taglish", question: "malamig ang kamay walang lumalabas na dugo", expected: { type: "answer", entryId: "m4-warm-hand" } },
  { id: "ncd-tag-22", language: "taglish", question: "saan ko itatapon ang nagamit na lancet", expected: { type: "answer", entryId: "m4-sharps-disposal" } },
  { id: "ncd-tag-23", language: "taglish", question: "natusok ako ng lancet ano gagawin ko", expected: { type: "answer", entryId: "m4-needlestick" } },
  { id: "ncd-tag-24", language: "taglish", question: "ubos na ang gwantes pwede pa ba sumuri", expected: { type: "answer", entryId: "m4-supplies-out" } },
  { id: "ncd-tag-25", language: "taglish", question: "natatakot sa tusok ang kliyente", expected: { type: "answer", entryId: "m4-afraid-of-prick" } },
  { id: "ncd-tag-26", language: "taglish", question: "paano magpaliwanag sa hindi marunong magbasa", expected: { type: "answer", entryId: "m5-low-literacy" } },
  { id: "ncd-tag-27", language: "taglish", question: "ayaw uminom ng bulong kasi nakakasira daw sa bato", expected: { type: "answer", entryId: "m5-medicine-myths" } },
  { id: "ncd-tag-28", language: "taglish", question: "naubos na ang maintenance nya ano gagawin", expected: { type: "answer", entryId: "m5-ran-out-of-medicine" } },
  { id: "ncd-tag-29", language: "taglish", question: "paano makaalala uminom ng gamot araw araw", expected: { type: "answer", entryId: "m5-remembering-medicine" } },
  { id: "ncd-tag-30", language: "taglish", question: "ano isusulat sa buwanang ulat", expected: { type: "answer", entryId: "m6-monthly-report" } },
];

// The entries whose whole job is to say "that is not yours to decide". A
// scope question may only ever be answered by one of these — answering it with
// a clinical-technique entry is the worst failure this system could produce.
export const scopeBoundaryEntryIds = [
  "m1-no-medicine-decisions",
  "m1-cannot-interpret-tests",
  "m1-screening-vs-diagnosis",
  "m1-bhw-scope",
  "m1-role-in-adherence",
];

// Questions outside BHW scope — the exact line Module 1 draws. Silence would be
// safe but unhelpful, so the bar is not "no answer": it is that the answer must
// come from scopeBoundaryEntryIds and never from a screening-technique entry.
export const ncdOutOfScopeFixtures = [
  { id: "ncd-neg-1", question: "What dose of metformin should I give for a blood sugar of 250?" },
  { id: "ncd-neg-2", question: "Can I start amlodipine 5mg for this patient?" },
  { id: "ncd-neg-3", question: "Ilang milligrams ng losartan ang ibibigay ko?" },
  { id: "ncd-neg-4", question: "How do I interpret this ECG tracing?" },
  { id: "ncd-neg-5", question: "Anong insulin dose ang itataas ko?" },
];

// Not in this corpus at all. These should surface as a content gap in the
// admin queue rather than be force-matched to an NCD entry.
export const ncdUnrelatedFixtures = [
  { id: "ncd-unrelated-1", question: "How do I renew my driver's license?" },
  { id: "ncd-unrelated-2", question: "Paano magtanim ng palay sa tag-ulan?" },
];

// Questions describing a client who needs help now. Every one of these was
// verified to be routed WRONG by score alone before the red-flag layer
// existed — "mataas ang presyon niya at sumasakit ang dibdib niya" scored
// 0.749 against m1-hypertension-definition (a definition of hypertension),
// and "180 ang presyon niya, ano gagawin ko" scored 0.709 against
// m4-blood-spill (how to clean up spilled blood). Both are above the 0.55
// answer threshold, so they were returned confidently with no hedge. These
// fixtures are the regression gate for that class of failure.
export const ncdRedFlagFixtures = [
  { id: "ncd-rf-1", question: "mataas ang presyon niya at sumasakit ang dibdib niya", expectedEntryId: "m3-very-high-with-symptoms" },
  { id: "ncd-rf-2", question: "high blood pressure with chest pain what do I do", expectedEntryId: "m3-very-high-with-symptoms" },
  { id: "ncd-rf-3", question: "nahihilo at masakit ang ulo, mataas ang presyon", expectedEntryId: "m3-very-high-with-symptoms" },
  { id: "ncd-rf-4", question: "malabo ang paningin niya at mataas ang bp", expectedEntryId: "m3-very-high-with-symptoms" },
  { id: "ncd-rf-5", question: "hirap huminga at altapresyon, ano gagawin ko", expectedEntryId: "m3-very-high-with-symptoms" },
  { id: "ncd-rf-6", question: "the client with hypertension has blurred vision", expectedEntryId: "m3-very-high-with-symptoms" },
  { id: "ncd-rf-7", question: "nanginginig at pinagpapawisan, mababa ang asukal", expectedEntryId: "m4-hypoglycemia" },
  { id: "ncd-rf-8", question: "the diabetic client is shaky and sweating", expectedEntryId: "m4-hypoglycemia" },
  { id: "ncd-rf-9", question: "mataas ang asukal at nagsusuka siya", expectedEntryId: "m4-very-high-glucose" },
  { id: "ncd-rf-10", question: "blood sugar is high and the client is drowsy", expectedEntryId: "m4-very-high-glucose" },
  { id: "ncd-rf-11", question: "nawalan ng malay ang kliyente", expectedEntryId: "m1-emergency-not-screening" },
  { id: "ncd-rf-12", question: "the client is unconscious", expectedEntryId: "m1-emergency-not-screening" },
  { id: "ncd-rf-13", question: "nangingisay siya ano gagawin ko", expectedEntryId: "m1-emergency-not-screening" },
  { id: "ncd-rf-14", question: "hindi makapagsalita at ngiwi ang mukha", expectedEntryId: "m1-emergency-not-screening" },
  { id: "ncd-rf-15", question: "himatay siya habang nag screening kami", expectedEntryId: "m1-emergency-not-screening" },
];

// Under-specified questions: a topic and an ask for action, but not the one
// detail that decides which answer is correct. These must return a clarifier
// rather than a confident guess.
export const ncdClarifierFixtures = [
  { id: "ncd-clr-1", question: "mataas ang BP niya, ano gagawin ko?", expectedClarifierId: "clr-bp-high-next-step" },
  { id: "ncd-clr-2", question: "180 ang presyon niya, ano gagawin ko", expectedClarifierId: "clr-bp-high-next-step" },
  { id: "ncd-clr-3", question: "his BP is high what do I do", expectedClarifierId: "clr-bp-high-next-step" },
  { id: "ncd-clr-4", question: "mataas ang asukal niya ano gagawin ko", expectedClarifierId: "clr-glucose-high-next-step" },
  { id: "ncd-clr-5", question: "the blood sugar is high what should I do", expectedClarifierId: "clr-glucose-high-next-step" },
];

// A clarifier must not hijack a question that is already specific. These name
// the same topic but ask something the KB answers directly, so they must
// route to an ordinary match rather than stopping to ask.
export const ncdNoClarifierFixtures = [
  { id: "ncd-noclr-1", question: "Gaano katagal dapat magpahinga bago sukatin ang presyon?" },
  { id: "ncd-noclr-2", question: "What size BP cuff should I use for a large arm?" },
  { id: "ncd-noclr-3", question: "Ilang beses ko dapat sukatin ang presyon?" },
  { id: "ncd-noclr-4", question: "Which finger should I prick?" },
];

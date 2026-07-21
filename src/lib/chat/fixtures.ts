import type { ChatEntryCandidate, SynonymRow } from "./types";

// A small Maternal & Child Health corpus standing in for INC-3-authored
// content, used only by the matcher's own tests — not seed data for the
// pilot (that's the 50-entry launch gate in delivery-plan.md §6.3).
export const mockKbEntries: ChatEntryCandidate[] = [
  {
    id: "fever-infant",
    question_en: "What should I do if my baby has a fever?",
    question_fil: "Ano ang gagawin ko kung may lagnat ang sanggol ko?",
    answer_en:
      "Keep the baby hydrated, use a lukewarm sponge bath, and bring them to the health center if the fever lasts more than two days or exceeds 38.5°C.",
    answer_fil:
      "Bigyan ng sapat na tubig ang sanggol, maligo ng maligamgam na tubig, at dalhin sa health center kung tumagal ng higit sa dalawang araw ang lagnat.",
    keywords: ["lagnat", "fever", "sanggol", "baby", "infant", "temperatura", "temperature"],
  },
  {
    id: "prenatal-checkup",
    question_en: "How many prenatal checkups should a pregnant woman have?",
    question_fil: "Ilang beses dapat magpa-prenatal checkup ang isang buntis?",
    answer_en:
      "At least four prenatal checkups are recommended during pregnancy, starting as early as possible in the first trimester.",
    answer_fil:
      "Inirerekomenda ang hindi bababa sa apat na prenatal checkup sa buong pagbubuntis, simula sa unang trimester.",
    keywords: ["prenatal", "checkup", "buntis", "pregnant", "pagbubuntis", "trimester"],
  },
  {
    id: "vaccination-schedule",
    question_en: "What is the vaccination schedule for newborns?",
    question_fil: "Ano ang schedule ng bakuna para sa bagong silang na sanggol?",
    answer_en:
      "Newborns receive BCG and Hepatitis B at birth, then follow the DPT, OPV, and measles schedule at the health center through 12 months.",
    answer_fil:
      "Ang bagong silang ay tumatanggap ng BCG at Hepatitis B sa kapanganakan, sinusundan ng DPT, OPV, at tigdas hanggang edad na 12 buwan.",
    keywords: ["bakuna", "vaccine", "vaccinated", "vaccination", "bagong", "silang", "newborn", "baby", "bcg"],
  },
  {
    id: "breastfeeding-benefits",
    question_en: "What are the benefits of breastfeeding for my baby?",
    question_fil: "Ano ang mga benepisyo ng pagpapasuso para sa aking sanggol?",
    answer_en:
      "Breast milk gives infants complete nutrition and antibodies, lowers infection risk, and strengthens the bond between mother and baby.",
    answer_fil:
      "Ang gatas ng ina ay nagbibigay ng kumpletong sustansya at antibodies, binabawasan ang panganib sa impeksyon, at nagpapalakas ng bigkis ng ina at sanggol.",
    keywords: ["breastfeeding", "pagpapasuso", "gatas", "suso", "nutrisyon", "antibodies"],
  },
  {
    id: "family-planning-methods",
    question_en: "What family planning methods are available at the health center?",
    question_fil: "Anong mga paraan ng family planning ang available sa health center?",
    answer_en:
      "The health center offers pills, injectables, condoms, IUDs, and natural family planning counseling free of charge.",
    answer_fil:
      "Nag-aalok ang health center ng pills, injectables, condom, IUD, at libreng konsultasyon para sa natural family planning.",
    keywords: ["family", "planning", "pagpaplano", "pamamaraan", "pamilya", "contraceptive", "pills", "iud"],
  },
  {
    id: "danger-signs-pregnancy",
    question_en: "What are the danger signs during pregnancy that need immediate attention?",
    question_fil:
      "Ano ang mga danger signs sa panahon ng pagbubuntis na kailangang bigyang-agad na pansin?",
    answer_en:
      "Severe headache, vaginal bleeding, blurred vision, and reduced fetal movement are danger signs — go to the health center right away.",
    answer_fil:
      "Matinding sakit ng ulo, pagdurugo, malabo ang paningin, at kaunting galaw ng sanggol sa tiyan ay mga danger signs — pumunta agad sa health center.",
    keywords: ["danger", "signs", "babala", "pagdurugo", "bleeding", "pregnancy", "pagbubuntis"],
  },
  {
    id: "diarrhea-child",
    question_en: "How do I treat diarrhea in a young child?",
    question_fil: "Paano gamutin ang pagtatae ng batang bata?",
    answer_en:
      "Give oral rehydration solution, continue feeding, and bring the child to the health center if diarrhea lasts more than two days or shows blood.",
    answer_fil:
      "Bigyan ng oral rehydration solution, ipagpatuloy ang pagpapakain, at dalhin sa health center kung tumagal ng higit dalawang araw o may dugo ang dumi.",
    keywords: ["diarrhea", "pagtatae", "bata", "anak", "child", "lbm", "rehydration"],
  },
  {
    id: "malnutrition-signs",
    question_en: "What are the signs of malnutrition in children?",
    question_fil: "Ano ang mga senyales ng malnutrisyon sa mga bata?",
    answer_en:
      "Watch for slow weight gain, visible rib bones, low energy, and swelling in the feet — the barangay health worker can weigh the child monthly.",
    answer_fil:
      "Bantayan ang mabagal na pagtaas ng timbang, kitang-kitang tadyang, kawalan ng lakas, at pamamaga ng paa — maaaring timbangin ng BHW ang bata buwan-buwan.",
    keywords: ["malnutrition", "malnourished", "malnutrisyon", "bata", "anak", "child", "timbang", "weight", "payat"],
  },
  {
    id: "cough-cold-infant",
    question_en: "What home remedies help a baby's cough and colds?",
    question_fil: "Anong lunas sa bahay ang makakatulong sa ubo at sipon ng sanggol?",
    answer_en:
      "Keep the baby warm, clear the nose with saline drops, and continue breastfeeding; see a doctor if breathing becomes fast or difficult.",
    answer_fil:
      "Panatilihing mainit ang sanggol, linisin ang ilong gamit ang saline drops, at ipagpatuloy ang pagpapasuso; magpatingin kung mabilis o mahirap huminga.",
    keywords: ["cough", "ubo", "colds", "sipon", "sanggol", "baby", "hininga"],
  },
  {
    id: "postpartum-care",
    question_en: "What postpartum care does a new mother need after giving birth?",
    question_fil: "Anong pangangalaga ang kailangan ng bagong panganak na ina pagkatapos manganak?",
    answer_en:
      "Rest, proper nutrition, wound care, and a postpartum checkup within the first week are essential for a new mother's recovery.",
    answer_fil:
      "Mahalaga ang pahinga, tamang nutrisyon, pag-aalaga sa sugat, at postpartum checkup sa unang linggo para sa paggaling ng bagong panganak.",
    keywords: ["postpartum", "panganganak", "panganak", "ina", "postnatal", "paggaling"],
  },
  {
    id: "handwashing-hygiene",
    question_en: "Why is handwashing important for family hygiene?",
    question_fil: "Bakit mahalaga ang paghuhugas ng kamay para sa kalinisan ng pamilya?",
    answer_en:
      "Washing hands with soap before eating and after using the toilet stops the spread of diarrhea, colds, and other infections.",
    answer_fil:
      "Ang paghuhugas ng kamay gamit ang sabon bago kumain at pagkatapos gumamit ng banyo ay pumipigil sa pagkalat ng pagtatae, sipon, at ibang impeksyon.",
    keywords: ["handwashing", "paghuhugas", "kamay", "hands", "family", "hygiene", "kalinisan", "sabon"],
  },
  {
    id: "teething-baby",
    question_en: "How do I care for a baby who is teething?",
    question_fil: "Paano alagaan ang sanggol na nagsisipngipin?",
    answer_en:
      "Offer a clean, chilled teething ring, gently rub the gums, and keep feeding as usual; mild fussiness and drooling are normal.",
    answer_fil:
      "Bigyan ng malinis at malamig na teething ring, dahan-dahang kuskusin ang gilagid, at ipagpatuloy ang normal na pagpapakain; normal lang ang bahagyang pag-iyak.",
    keywords: ["teething", "ngipin", "sanggol", "baby", "gilagid", "panginginig"],
  },
];

export const mockSynonyms: SynonymRow[] = [
  { term: "bkit", maps_to: "bakit", language: "taglish" },
  { term: "pano", maps_to: "paano", language: "taglish" },
  { term: "bkuna", maps_to: "bakuna", language: "taglish" },
  { term: "lgnat", maps_to: "lagnat fever", language: "taglish" },
  { term: "ubo2", maps_to: "ubo cough", language: "taglish" },
  { term: "lbm", maps_to: "diarrhea pagtatae", language: "taglish" },
  { term: "fp", maps_to: "family planning contraceptive pamamaraan", language: "taglish" },
  { term: "check up", maps_to: "checkup", language: "en" },
  { term: "mag pa bakuna", maps_to: "pagpapabakuna vaccination bakuna", language: "taglish" },
  { term: "ayaw kumain", maps_to: "malnutrisyon payat malnutrition", language: "taglish" },
  { term: "nagtatae", maps_to: "pagtatae diarrhea", language: "fil" },
];

export type ChatFixtureExpectation =
  | { type: "answer"; entryId: string }
  | { type: "did_you_mean" }
  | { type: "no_answer" };

export type ChatFixture = {
  id: string;
  language: "en" | "fil" | "taglish";
  question: string;
  expected: ChatFixtureExpectation;
};

export const chatCorpusFixtures: ChatFixture[] = [
  // --- English (20) ---
  { id: "en-1", language: "en", question: "My baby has a high fever, what should I do?", expected: { type: "answer", entryId: "fever-infant" } },
  { id: "en-2", language: "en", question: "How can I bring down my infant's temperature?", expected: { type: "answer", entryId: "fever-infant" } },
  { id: "en-3", language: "en", question: "How often should a pregnant woman go for a prenatal checkup?", expected: { type: "answer", entryId: "prenatal-checkup" } },
  { id: "en-4", language: "en", question: "When should my newborn get vaccinated?", expected: { type: "answer", entryId: "vaccination-schedule" } },
  { id: "en-5", language: "en", question: "Why is breastfeeding good for my baby?", expected: { type: "answer", entryId: "breastfeeding-benefits" } },
  { id: "en-6", language: "en", question: "What contraceptive methods can I get at the health center?", expected: { type: "answer", entryId: "family-planning-methods" } },
  { id: "en-7", language: "en", question: "What pregnancy symptoms are dangerous and need a doctor right away?", expected: { type: "answer", entryId: "danger-signs-pregnancy" } },
  { id: "en-8", language: "en", question: "My child has diarrhea, how do I treat it at home?", expected: { type: "answer", entryId: "diarrhea-child" } },
  { id: "en-9", language: "en", question: "How do I know if my child is malnourished?", expected: { type: "answer", entryId: "malnutrition-signs" } },
  { id: "en-10", language: "en", question: "My baby has a cough and cold, what home remedy helps?", expected: { type: "answer", entryId: "cough-cold-infant" } },
  { id: "en-11", language: "en", question: "What care does a mother need right after giving birth?", expected: { type: "answer", entryId: "postpartum-care" } },
  { id: "en-12", language: "en", question: "Why should families wash their hands often?", expected: { type: "answer", entryId: "handwashing-hygiene" } },
  { id: "en-13", language: "en", question: "My baby is teething, how do I soothe the gums?", expected: { type: "answer", entryId: "teething-baby" } },
  { id: "en-14", language: "en", question: "What temperature counts as a fever in babies?", expected: { type: "answer", entryId: "fever-infant" } },
  { id: "en-15", language: "en", question: "What vaccines does a baby need in the first year?", expected: { type: "answer", entryId: "vaccination-schedule" } },
  { id: "en-16", language: "en", question: "My child is sick", expected: { type: "did_you_mean" } },
  { id: "en-17", language: "en", question: "baby health", expected: { type: "did_you_mean" } },
  { id: "en-18", language: "en", question: "pregnant problems", expected: { type: "did_you_mean" } },
  { id: "en-19", language: "en", question: "What time does the barangay hall open?", expected: { type: "no_answer" } },
  { id: "en-20", language: "en", question: "How do I renew my driver's license?", expected: { type: "no_answer" } },

  // --- Filipino (20) ---
  { id: "fil-1", language: "fil", question: "Ilang beses akong dapat magpa-checkup habang buntis?", expected: { type: "answer", entryId: "prenatal-checkup" } },
  { id: "fil-2", language: "fil", question: "May lagnat ang aking sanggol, ano ang gagawin ko?", expected: { type: "answer", entryId: "fever-infant" } },
  { id: "fil-3", language: "fil", question: "Kailan dapat magpabakuna ang aking bagong silang na sanggol?", expected: { type: "answer", entryId: "vaccination-schedule" } },
  { id: "fil-4", language: "fil", question: "Ano ang mabuting dulot ng pagpapasuso sa sanggol?", expected: { type: "answer", entryId: "breastfeeding-benefits" } },
  { id: "fil-5", language: "fil", question: "Anong pamamaraan ng family planning ang pwede kong makuha sa health center?", expected: { type: "answer", entryId: "family-planning-methods" } },
  { id: "fil-6", language: "fil", question: "Anong mga babala sa pagbubuntis ang dapat kong bantayan?", expected: { type: "answer", entryId: "danger-signs-pregnancy" } },
  { id: "fil-7", language: "fil", question: "Anong gagawin ko kung nagtatae ang aking anak?", expected: { type: "answer", entryId: "diarrhea-child" } },
  { id: "fil-8", language: "fil", question: "Paano ko malalaman kung malnutrisyon ang aking anak?", expected: { type: "answer", entryId: "malnutrition-signs" } },
  { id: "fil-9", language: "fil", question: "May ubo at sipon ang sanggol ko, ano ang lunas sa bahay?", expected: { type: "answer", entryId: "cough-cold-infant" } },
  { id: "fil-10", language: "fil", question: "Anong pangangalaga ang kailangan ko pagkatapos manganak?", expected: { type: "answer", entryId: "postpartum-care" } },
  { id: "fil-11", language: "fil", question: "Bakit importante ang paghuhugas ng kamay sa pamilya?", expected: { type: "answer", entryId: "handwashing-hygiene" } },
  { id: "fil-12", language: "fil", question: "Paano ko aalagaan ang sanggol kong nagsisipngipin?", expected: { type: "answer", entryId: "teething-baby" } },
  { id: "fil-13", language: "fil", question: "Anong temperatura na ang tinatawag na lagnat sa sanggol?", expected: { type: "answer", entryId: "fever-infant" } },
  { id: "fil-14", language: "fil", question: "Anong mga bakuna ang kailangan ng sanggol sa unang taon?", expected: { type: "answer", entryId: "vaccination-schedule" } },
  { id: "fil-15", language: "fil", question: "Gaano kadalas ang prenatal checkup para sa buntis?", expected: { type: "answer", entryId: "prenatal-checkup" } },
  { id: "fil-16", language: "fil", question: "May sakit ang bata ko", expected: { type: "did_you_mean" } },
  { id: "fil-17", language: "fil", question: "kalusugan ng sanggol", expected: { type: "did_you_mean" } },
  { id: "fil-18", language: "fil", question: "problema sa pagbubuntis", expected: { type: "did_you_mean" } },
  { id: "fil-19", language: "fil", question: "Anong oras nagbukas ang barangay hall?", expected: { type: "no_answer" } },
  { id: "fil-20", language: "fil", question: "Paano mag-apply ng business permit?", expected: { type: "no_answer" } },

  // --- Taglish / misspelled (20) ---
  { id: "tag-1", language: "taglish", question: "Grabe yung lagnat ng baby ko, ano gagawin?", expected: { type: "answer", entryId: "fever-infant" } },
  { id: "tag-2", language: "taglish", question: "Ano gagawin kung high fever si baby?", expected: { type: "answer", entryId: "fever-infant" } },
  { id: "tag-3", language: "taglish", question: "lgnat ng sanggol ko, tulong!", expected: { type: "answer", entryId: "fever-infant" } },
  { id: "tag-4", language: "taglish", question: "kelan dapat mag pa bakuna yung newborn ko?", expected: { type: "answer", entryId: "vaccination-schedule" } },
  { id: "tag-5", language: "taglish", question: "ano schedule ng bkuna ng bagong silang?", expected: { type: "answer", entryId: "vaccination-schedule" } },
  { id: "tag-6", language: "taglish", question: "ilang beses dapat mag prenatal check up pag buntis?", expected: { type: "answer", entryId: "prenatal-checkup" } },
  { id: "tag-7", language: "taglish", question: "anong FP methods meron sa health center?", expected: { type: "answer", entryId: "family-planning-methods" } },
  { id: "tag-8", language: "taglish", question: "may LBM yung anak ko, ano gawin?", expected: { type: "answer", entryId: "diarrhea-child" } },
  { id: "tag-9", language: "taglish", question: "pagtatae ng bata ko, paano gamutin?", expected: { type: "answer", entryId: "diarrhea-child" } },
  { id: "tag-10", language: "taglish", question: "ubo2 na si baby, may lunas ba sa bahay?", expected: { type: "answer", entryId: "cough-cold-infant" } },
  { id: "tag-11", language: "taglish", question: "sipon at ubo ng sanggol ko, ano dapat gawin?", expected: { type: "answer", entryId: "cough-cold-infant" } },
  { id: "tag-12", language: "taglish", question: "ayaw kumain ng anak ko, malnutrisyon kaya yun?", expected: { type: "answer", entryId: "malnutrition-signs" } },
  { id: "tag-13", language: "taglish", question: "paano malalaman kung malnourished yung bata?", expected: { type: "answer", entryId: "malnutrition-signs" } },
  { id: "tag-14", language: "taglish", question: "ano benefits ng pagpapasuso sa baby?", expected: { type: "answer", entryId: "breastfeeding-benefits" } },
  { id: "tag-15", language: "taglish", question: "anong pangangalaga after manganak si nanay?", expected: { type: "answer", entryId: "postpartum-care" } },
  { id: "tag-16", language: "taglish", question: "bkit importante mag hugas ng kamay?", expected: { type: "answer", entryId: "handwashing-hygiene" } },
  { id: "tag-17", language: "taglish", question: "nagsisipngipin si baby ko, paano ko aalagaan?", expected: { type: "answer", entryId: "teething-baby" } },
  { id: "tag-18", language: "taglish", question: "sakit ni baby", expected: { type: "did_you_mean" } },
  { id: "tag-19", language: "taglish", question: "pano mag renew ng license sa lto?", expected: { type: "no_answer" } },
  { id: "tag-20", language: "taglish", question: "san po pwede mag bayad ng bill sa barangay?", expected: { type: "no_answer" } },
];

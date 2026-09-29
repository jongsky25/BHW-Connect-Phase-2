import yakap from "../../../content/kb/philhealth-gabay/entries/module-1.json";
import gamot from "../../../content/kb/philhealth-gabay/entries/module-2.json";
import registration from "../../../content/kb/philhealth-gabay/entries/module-3.json";
import synonyms from "../../../content/kb/philhealth-gabay/synonyms.json";
import clarifiers from "../../../content/kb/philhealth-gabay/clarifiers.json";
import type { ChatEntryCandidate, Clarifier, SynonymRow } from "./types";

export const gabayKbEntries: ChatEntryCandidate[] = [yakap, gamot, registration]
  .flatMap((file) => file.entries)
  .map((entry, index) => ({
    id: `00000000-0000-4004-8000-${String(index).padStart(12, "0")}`,
    content_id: entry.id,
    question_en: entry.question_en,
    question_fil: entry.question_fil,
    answer_en: entry.answer_en,
    answer_fil: entry.answer_fil,
    keywords: entry.keywords,
  }));

export const gabaySynonyms = synonyms.synonyms as SynonymRow[];
export const gabayClarifiers = clarifiers.clarifiers as Clarifier[];

// Independent BHW/resident wording, written separately from the entry questions.
// Three phrasings per entry: English, Filipino, and Taglish or a likely typo.
export const gabayRetrievalCases: Array<{ id: string; en: string; fil: string; taglish: string }> = [
  { id: "ph-yakap-what", en: "Could you explain the YAKAP program?", fil: "Ano ba ang programang YAKAP?", taglish: "Yakep program, ano ito?" },
  { id: "ph-yakap-who", en: "Does YAKAP include my dependent?", fil: "Kasali ba ang dependent ko sa YAKAP?", taglish: "YAKAP para sa anak kong dependent?" },
  { id: "ph-yakap-clinic-find", en: "Where can I see the list of YAKAP clinics?", fil: "Saan makikita ang listahan ng YAKAP clinic?", taglish: "Hanap accredited YAKAP provider near me" },
  { id: "ph-yakap-first-visit", en: "What should I do on my first YAKAP clinic visit?", fil: "Ano ang mangyayari sa unang pagbisita sa YAKAP clinic?", taglish: "After YAKAP selection, FPE next?" },
  { id: "ph-yakap-test", en: "Will YAKAP give me the laboratory test I ask for?", fil: "Sigurado ba na makukuha ko ang test sa YAKAP?", taglish: "Guaranteed ba ang specific lab test sa YAKAP?" },
  { id: "ph-gamot-what", en: "Explain the PhilHealth GAMOT benefit", fil: "Ano ba ang benepisyong GAMOT ng PhilHealth?", taglish: "GAMOT package meaning?" },
  { id: "ph-gamot-get", en: "What are the steps to get medicine under GAMOT?", fil: "Paano ang pagkuha ng gamot sa programang GAMOT?", taglish: "May reseta na, paano mag-dispense sa GAMOT?" },
  { id: "ph-gamot-facility", en: "Where is a participating GAMOT pharmacy?", fil: "Saan makakahanap ng accredited na botika sa GAMOT?", taglish: "Find GAMOT dispensing provider list" },
  { id: "ph-gamot-stock", en: "Does the pharmacy have my GAMOT medicine in stock today?", fil: "May stock ba ngayon sa botika ng GAMOT na gamot ko?", taglish: "Out of stock ba yung GAMOT meds ngayon?" },
  { id: "ph-gamot-dose", en: "What dose or replacement for my GAMOT prescription?", fil: "Anong dosis o pamalit na gamot ang puwede?", taglish: "Ilang tableta or substitute sa GAMOT?" },
  { id: "ph-pin-none", en: "I do not have a PhilHealth member number yet", fil: "Wala pa akong PhilHealth PIN", taglish: "No PIN pa ako, apply PhilHealth?" },
  { id: "ph-pin-unknown", en: "I forgot my PhilHealth PIN; do I reapply?", fil: "Hindi ko maalala ang PhilHealth number ko, kailangan ba ulit mag-apply?", taglish: "Lost PIN ko, verify old record?" },
  { id: "ph-record-correction", en: "PhilHealth has the wrong name on my record", fil: "Mali ang pangalan sa PhilHealth record ko", taglish: "Paano i-correct dependent details sa PhilHealth?" },
  { id: "ph-clinic-select", en: "With a PIN, how can I select my YAKAP clinic?", fil: "May PIN ako, paano pipili ng YAKAP clinic?", taglish: "Register YAKAP clinic via eGovPH?" },
  { id: "ph-clinic-no-internet", en: "I have no phone or internet to choose a YAKAP clinic", fil: "Wala akong internet para pumili ng YAKAP clinic", taglish: "Offline ako, saan magselect ng YAKAP clinic?" },
  { id: "ph-dependent-selection", en: "How do I check which YAKAP clinic my dependent has?", fil: "Paano matitiyak ang YAKAP clinic ng dependent ko?", taglish: "Dependent YAKAP empanelment same ba sa member?" },
  { id: "ph-clinic-transfer", en: "Can I change to a different YAKAP clinic?", fil: "Puwede ba akong lumipat ng YAKAP clinic?", taglish: "YAKAP transfer provider, paano?" },
  { id: "ph-benefit-charge", en: "The YAKAP clinic charged me; what should I do?", fil: "Siningil ako sa YAKAP clinic, saan magtatanong?", taglish: "Free ba lahat ng GAMOT o may bayad?" },
  { id: "ph-credentials", en: "Should I tell the BHW my PhilHealth password?", fil: "Ibibigay ko ba sa BHW ang one-time code ko?", taglish: "Share OTP sa BHW para sa PhilHealth login?" },
];

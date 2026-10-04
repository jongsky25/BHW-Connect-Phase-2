import cebuano from "../../../content/training/day1-basic-competencies/modules/02-uhc-act/lessons/uhc-primary-care/translation.ceb.json";
import hiligaynon from "../../../content/training/day1-basic-competencies/modules/02-uhc-act/lessons/uhc-primary-care/translation.hil.json";
// The two scripts carry the same actions and claims. One Gemini request per
// scene makes the measured audio boundaries the scene and caption boundaries.
export type PrimaryCareBeat = {
  id: string;
  fil: string;
  en: string;
  title_fil: string;
  title_en: string;
  detail_fil: string;
  detail_en: string;
};

const baseBeats: PrimaryCareBeat[] = [
  {
    id: "question",
    fil: "Muling tanong ni Mang Ernesto kay BHW Vlanche: Saan po ako magpapacheckup? At kung may referral, saan? Hindi nanghula si Vlanche.",
    en: "Mang Ernesto asks BHW Vlanche again: Where do I start for a checkup? And if I need a referral, where do I go? Vlanche does not guess.",
    title_fil: "Ano ang susunod na hakbang?",
    title_en: "What is the next step?",
    detail_fil: "Makinig muna. Huwag manghula.",
    detail_en: "Listen first. Do not guess.",
  },
  {
    id: "four-changes",
    fil: "Apat ang pagbabago sa gabay: PhilHealth inclusion, outpatient consultation, pagpili ng primary care provider, at referral. Natalakay na ang una; susundan nila ang tatlo pa.",
    en: "They recall the guide’s four changes: PhilHealth inclusion, outpatient consultation, choosing a primary care provider, and a better referral system. They covered the first one already; now they follow the other three.",
    title_fil: "Apat na pagbabago",
    title_en: "Four changes",
    detail_fil: "PhilHealth → outpatient → provider → referral",
    detail_en: "PhilHealth → outpatient → provider → referral",
  },
  {
    id: "outpatient",
    fil: "May outpatient at primary care benefits ang PhilHealth YAKAP, ngunit may tuntunin. Aalamin ni Vlanche sa health team kung sakop ang konsultasyon ni Ernesto at sa aling accredited clinic ito makukuha.",
    en: "PhilHealth YAKAP has outpatient and primary care benefits, but each service has rules. Vlanche asks the health team which benefit applies to Mang Ernesto’s consultation and at which accredited clinic it is available.",
    title_fil: "Tiyakin ang benepisyo",
    title_en: "Confirm the benefit",
    detail_fil: "Serbisyo · sakop · clinic",
    detail_en: "Service · coverage · clinic",
  },
  {
    id: "provider",
    fil: "Makapipili si Mang Ernesto ng primary care clinic. Hindi patunay ang PhilHealth inclusion na may napili na siya. Aalamin nila sa RHU o PhilHealth ang kasalukuyang pagpipilian at proseso.",
    en: "Mang Ernesto can choose a primary care clinic. PhilHealth inclusion does not mean he has selected one already. Vlanche helps him check current choices and how to select with the RHU or PhilHealth.",
    title_fil: "Clinic na pinili niya",
    title_en: "A clinic he chooses",
    detail_fil: "Alamin ang napili o mapipiling clinic.",
    detail_en: "Check the chosen or available clinic.",
  },
  {
    id: "referral",
    fil: "Clinician ang magpapasya sa referral kung kailangan ng ibang pangangalaga. Kukunin ni Vlanche sa health team ang lokal na contact at tagubilin. Hindi siya huhula ng ospital.",
    en: "If another level of care is needed, a clinician decides on the referral. Local processes can differ. Vlanche asks the health team for the right contact and instructions; she does not choose a hospital by guesswork.",
    title_fil: "Sundin ang lokal na referral",
    title_en: "Follow the local referral path",
    detail_fil: "Clinician ang nagpapasya. BHW ang umaalalay.",
    detail_en: "Clinician decides. BHW supports.",
  },
  {
    id: "next-step",
    fil: "Sinabi ni Vlanche: Tiyakin natin ang inyong clinic, benepisyo, at susunod na hakbang. Kung may referral mula sa clinician, kukunin natin ang lokal na proseso. Sasamahan ko kayong magtanong sa health team.",
    en: "Vlanche says: Let us confirm your clinic, the benefit for this consultation, and the next step. If a clinician recommends referral, we will get the local process. I will help you ask the health team.",
    title_fil: "Tiyakin, saka umalalay",
    title_en: "Confirm, then support",
    detail_fil: "Clinic · benepisyo · lokal na tagubilin",
    detail_en: "Clinic · benefit · local instructions",
  },
];

export const PRIMARY_CARE_BEATS = baseBeats.map((beat, index) => {
  const ceb = cebuano.story_beats[index], hil = hiligaynon.story_beats[index];
  if (ceb.id !== beat.id || hil.id !== beat.id) throw new Error("Primary-care translated beat order mismatch");
  return {...beat, ceb: ceb.text, hil: hil.text, title_ceb: ceb.title, title_hil: hil.title, detail_ceb: ceb.detail, detail_hil: hil.detail};
});
export const PRIMARY_CARE_LABELS = {
  fil: {items: ["PhilHealth", "Outpatient", "Primary care", "Referral"], outpatient: ["Konsulta", "Tuntunin", "Accredited clinic"], provider: ["Pagpili", "Unang pagbisita", "Kumpirmasyon"], referral: ["Clinician: pasya", "Health team: proseso", "BHW: alalay"], next_step: "Susunod na hakbang", summary: ["Clinic", "Benepisyo", "Tagubilin"]},
  en: {items: ["PhilHealth", "Outpatient", "Primary care", "Referral"], outpatient: ["Consultation", "Rules", "Accredited clinic"], provider: ["Choice", "First encounter", "Confirmation"], referral: ["Clinician: decision", "Health team: pathway", "BHW: support"], next_step: "The next step", summary: ["Clinic", "Benefit", "Instructions"]},
  ceb: cebuano.scene_labels, hil: hiligaynon.scene_labels,
};

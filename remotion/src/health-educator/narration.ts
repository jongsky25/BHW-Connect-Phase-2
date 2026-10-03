// Companion animation for the approved 1.1.2 Health Educator lesson.
// It teaches audience choice and inclusion, not detailed clinical advice.
import cebuano from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-health-educator/translation.ceb.json" with { type: "json" };
import hiligaynon from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-health-educator/translation.hil.json" with { type: "json" };

type BaseHealthEducatorBeat = {
  id: string;
  fil: string;
  en: string;
  title_fil: string;
  title_en: string;
  detail_fil: string;
  detail_en: string;
};

const baseBeats: BaseHealthEducatorBeat[] = [
  {
    id: "listen",
    fil: "Sa isang talakayang pangkalusugan sa barangay, hindi lang binabasa ni BHW Riza ang poster. Inaalam muna niya ang mga tanong ng mga residente, saka nagpapaliwanag nang malinaw.",
    en: "At a barangay health discussion, BHW Riza does more than read a poster. She first learns what residents are asking, then explains clearly.",
    title_fil: "Magsimula sa kausap",
    title_en: "Start with your audience",
    detail_fil: "Makinig muna sa tanong.",
    detail_en: "Listen to the question first.",
  },
  {
    id: "topics",
    fil: "Bilang Health Educator, maaari niyang talakayin ang pangangalaga sa katawan, kalinisan ng paligid, at paglapit sa serbisyong pangkalusugan. Gumagamit siya ng materyal na aprubado ng health team.",
    en: "As a Health Educator, she may discuss care for the body, clean surroundings, and how to reach health services. She uses materials approved by the health team.",
    title_fil: "Katawan at kapaligiran",
    title_en: "Body and environment",
    detail_fil: "Gumamit ng aprubadong materyal.",
    detail_en: "Use approved materials.",
  },
  {
    id: "life-stages",
    fil: "Magkakaiba ang tanong ng tagapag-alaga ng sanggol, kabataan, buntis, at nakatatanda. Iniaangkop ni Riza ang usapan tungkol sa sakit, aksidente, at panganib sa yugto ng buhay ng kausap.",
    en: "An infant's caregiver, a young person, a pregnant resident, and an older adult may have different questions. Riza adapts discussions of illness, accidents, and risks to each life stage.",
    title_fil: "Iba't ibang yugto",
    title_en: "Different life stages",
    detail_fil: "Iangkop ang usapan sa kausap.",
    detail_en: "Fit the discussion to the listener.",
  },
  {
    id: "reach",
    fil: "Napansin ni Riza na mga magulang lamang ang dumalo. Tinanong niya kung sino pa ang hindi naaabot, at kung anong oras, lugar, wika, at paraan ang makatutulong sa kanila.",
    en: "Riza notices that only parents attended. She asks who else is missing and what time, place, language, and format could help them take part.",
    title_fil: "Sino ang wala rito?",
    title_en: "Who is missing?",
    detail_fil: "Abutin ang bawat sektor.",
    detail_en: "Reach every community group.",
  },
  {
    id: "young-people",
    fil: "Upang makasali ang mga kabataan, tatanungin ni Riza kung kailan sila maaari at kung ano ang nais nilang malaman. Iaangkop niya ang talakayan sa kanilang tanong, habang tinitiyak na tama at aprubado ang impormasyon.",
    en: "To include young people, Riza asks when they can join and what they want to learn. She adapts the discussion to their questions while keeping the information accurate and approved.",
    title_fil: "Anyayahan ang kabataan",
    title_en: "Invite young people",
    detail_fil: "Makinig · Iangkop · Isama",
    detail_en: "Listen · Adapt · Include",
  },
  {
    id: "summary",
    fil: "Ang pagtuturo ng BHW ay pag-uusap na may layunin: makinig, pumili ng angkop na paksa at aprubadong materyal, iangkop sa yugto ng buhay, at gawing posible ang paglahok ng bawat grupo.",
    en: "BHW health education is a purposeful conversation: listen, choose a suitable topic and approved materials, adapt to life stage, and make participation possible for every group.",
    title_fil: "Makinig · Iangkop · Isama",
    title_en: "Listen · Adapt · Include",
    detail_fil: "Angkop na aral para sa bawat grupo",
    detail_en: "Learning that reaches every group",
  },
];

export type HealthEducatorBeat = BaseHealthEducatorBeat & {
  ceb: string; title_ceb: string; detail_ceb: string;
  hil: string; title_hil: string; detail_hil: string;
};
export const HEALTH_EDUCATOR_BEATS: HealthEducatorBeat[] = baseBeats.map((beat, index) => {
  const ceb = cebuano.story_beats[index], hil = hiligaynon.story_beats[index];
  if (ceb.id !== beat.id || hil.id !== beat.id) throw new Error("Lesson 1.1.2 translated story beats are misordered");
  return { ...beat, ceb: ceb.text, title_ceb: ceb.title, detail_ceb: ceb.detail,
    hil: hil.text, title_hil: hil.title, detail_hil: hil.detail };
});
export const HEALTH_EDUCATOR_SUMMARY = { ceb: cebuano.summary_steps, hil: hiligaynon.summary_steps };
if (cebuano.summary_steps.length !== 4 || hiligaynon.summary_steps.length !== 4)
  throw new Error("Lesson 1.1.2 needs four translated summary cards");

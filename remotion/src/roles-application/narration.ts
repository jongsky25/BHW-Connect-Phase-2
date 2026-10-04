// Companion to lesson 1.1.6; fictional environmental observation and handover.
import cebuano from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-application/translation.ceb.json" with { type: "json" };
import hiligaynon from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-application/translation.hil.json" with { type: "json" };

type BaseRolesApplicationBeat = {
  id: string;
  fil: string;
  en: string;
  title_fil: string;
  title_en: string;
  detail_fil: string;
  detail_en: string;
};

const baseBeats: BaseRolesApplicationBeat[] = [
  {
    id: "observation",
    fil: "May naipong tubig sa tatlong bakuran na napuntahan ni Riza. Tagubilin ng midwife: itala ang nakita, magtanong kung may gustong makausap ang health team, at iulat ang kailangan pang aksyon.",
    en: "Riza notices standing water in three yards. The midwife asks her to record the observation, ask whether anyone wants to speak with the health team, and report what action is still needed.",
    title_fil: "Isang obserbasyon",
    title_en: "One observation",
    detail_fil: "Itala · Magtanong · Iulat\nObserbasyon lamang; huwag manghula ng diagnosis.",
    detail_en: "Record · Ask · Report\nAn observation; do not invent a diagnosis.",
  },
  {
    id: "educate",
    fil: "Bilang Health Educator, nakikinig muna si Riza sa tanong ng pamilya. Gumagamit siya ng aprubadong mensahe, at nililinaw sa health team ang hindi niya tiyak na sagot.",
    en: "As a Health Educator, Riza first listens to the family's question. She uses an approved message and asks the health team about any answer she is unsure of.",
    title_fil: "Makinig at magpaliwanag",
    title_en: "Listen and explain",
    detail_fil: "Health Educator\n“May gusto po ba kayong itanong?”",
    detail_en: "Health Educator\n“Is there anything you would like to ask?”",
  },
  {
    id: "organize",
    fil: "Bilang Community Organizer, inaanyayahan ni Riza ang mga residente, lokal na lider, at health staff. Pinakikinggan niya ang kanilang mungkahi bago magkasundo sa oras at gawain.",
    en: "As a Community Organizer, Riza invites residents, local leaders, and health staff. She listens to their suggestions before they agree on a time and activity.",
    title_fil: "Anyayahan at makinig",
    title_en: "Invite and listen",
    detail_fil: "Community Organizer\nMagkasundo kasama ang mga tao.",
    detail_en: "Community Organizer\nAgree with the people involved.",
  },
  {
    id: "provider",
    fil: "May residenteng gustong makausap ang health team. Bilang Health Service Provider, kinukumpirma ni Riza ang contact, ipinapaliwanag ang hakbang, at itinatala ang aktwal na ginawa sa loob ng kanyang pagsasanay.",
    en: "A resident wants to speak with the health team. As a Health Service Provider, Riza confirms the contact, explains the next step, and records the actual action within her training.",
    title_fil: "Gumabay at itala",
    title_en: "Guide and record",
    detail_fil: "Health Service Provider\nTiyakin ang contact at lokal na paraan.",
    detail_en: "Health Service Provider\nConfirm the contact and local route.",
  },
  {
    id: "handover",
    fil: "Sa midwife, iniulat ni Riza: may tubig sa tatlong bakuran; naitala ko, nakinig, at nakipag-ugnayan; kailangan ko pa ng gabay sa susunod na hakbang. Dapat tugma ang tala at ulat.",
    en: "Riza tells the midwife: water in three yards; I recorded it, listened, and connected with people; I still need guidance on the next step. The record and report must agree.",
    title_fil: "Maikling handover",
    title_en: "A short handover",
    detail_fil: "Nakita · Ginawa · Kailangan\nKaugnay na impormasyon, tamang tatanggap.",
    detail_en: "Observed · Done · Needed\nRelevant information, appropriate recipient.",
  },
  {
    id: "summary",
    fil: "Isang sitwasyon, tatlong tungkulin. Sundin ang tagubilin at bigkasin ang sarili mong handover. Ipaliwanag ang mga tungkuling ginamit. Hiwalay na oobserbahan ang praktikal na kakayahan.",
    en: "One situation, three roles. Follow the instruction and speak your own handover. Explain the roles you used. Practical competence is observed separately.",
    title_fil: "Isang sitwasyon, tatlong tungkulin",
    title_en: "One situation, three roles",
    detail_fil: "Bigkasin ang sariling handover. Hiwalay ang praktikal na assessment.",
    detail_en: "Speak your own handover. Practical assessment is separate.",
  },
];

export type RolesApplicationBeat = BaseRolesApplicationBeat & {
  ceb: string; title_ceb: string; detail_ceb: string;
  hil: string; title_hil: string; detail_hil: string;
};
export const ROLES_APPLICATION_BEATS: RolesApplicationBeat[] = baseBeats.map((beat, index) => {
  const ceb = cebuano.story_beats[index], hil = hiligaynon.story_beats[index];
  if (ceb.id !== beat.id || hil.id !== beat.id) throw new Error("Lesson 1.1.6 translated story beats are misordered");
  return { ...beat, ceb: ceb.text, title_ceb: ceb.title, detail_ceb: ceb.detail,
    hil: hil.text, title_hil: hil.title, detail_hil: hil.detail };
});
export const HANDOVER_TRANSLATIONS = { ceb: cebuano.handover_cards, hil: hiligaynon.handover_cards };
export const APPLICATION_SCENE_LABELS = { ceb: cebuano.scene_labels, hil: hiligaynon.scene_labels };
for (const cards of Object.values(HANDOVER_TRANSLATIONS)) {
  if (cards.labels.length !== 3 || cards.lines.length !== 3) throw new Error("Lesson 1.1.6 needs three translated handover cards");
}

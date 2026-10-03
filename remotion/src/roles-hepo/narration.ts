// Companion animation for the approved 1.1.1 BHW and HEPO lesson.
// The three duties are connected examples, not an appointment or org chart.

import translation from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-hepo/translation.ceb.json" with { type: "json" };
import hiligaynon from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-hepo/translation.hil.json" with { type: "json" };

type BaseRolesHepoBeat = {
  id: string;
  fil: string;
  en: string;
  title_fil: string;
  title_en: string;
  detail_fil: string;
  detail_en: string;
};

const baseBeats: BaseRolesHepoBeat[] = [
  {
    id: "morning",
    fil: "Isang umaga, tatlong gawain ang haharapin ni BHW Riza. Magtuturo siya sa purok, makikipagplano sa mga residente, at tutulong kay Aling Nena na makausap ang midwife.",
    en: "One morning, BHW Riza has three tasks. She will lead a health discussion, plan with residents, and help Aling Nena contact the midwife.",
    title_fil: "Isang umaga, tatlong gawain",
    title_en: "One morning, three tasks",
    detail_fil: "08:00 · 10:00 · 11:00",
    detail_en: "8 a.m. · 10 a.m. · 11 a.m.",
  },
  {
    id: "educate",
    fil: "Sa talakayan, nakikinig si Riza sa tanong ng mga tao at nagbabahagi ng malinaw at aprubadong impormasyong pangkalusugan. Ito ang papel niyang Health Educator.",
    en: "At the discussion, Riza listens to people's questions and shares clear, approved health information. This is her Health Educator role.",
    title_fil: "Magturo",
    title_en: "Educate",
    detail_fil: "Makinig at magbahagi ng tamang kaalaman.",
    detail_en: "Listen and share accurate knowledge.",
  },
  {
    id: "organize",
    fil: "Para sa paglilinis ng barangay, inaanyayahan ni Riza ang mga residente na magplano at kumilos kasama niya. Bilang Community Organizer, pinag-uugnay niya ang mga tao.",
    en: "For a barangay clean-up, Riza invites residents to plan and act with her. As a Community Organizer, she brings people together.",
    title_fil: "Mag-organisa",
    title_en: "Organize",
    detail_fil: "Mag-anyaya ng pakikilahok.",
    detail_en: "Invite participation.",
  },
  {
    id: "guide",
    fil: "Kapag kailangan ni Aling Nena ng tulong para sa anak, tinutulungan siya ni Riza na makausap ang midwife. Bilang Health Service Provider, ginagabayan niya ang paglapit sa serbisyo.",
    en: "When Aling Nena needs help for her child, Riza helps her contact the midwife. In the Health Service Provider role, she helps the family reach care.",
    title_fil: "Gumabay sa serbisyo",
    title_en: "Guide to services",
    detail_fil: "Tulungan silang makalapit sa health worker.",
    detail_en: "Help them reach a health worker.",
  },
  {
    id: "hepo",
    fil: "Tinatawag ng Reference Manual ang papel sa pagsusulong ng kalusugan na barangay-level Health Education and Promotion Officer, o HEPO. Magkakaugnay rito ang pagtuturo, pag-oorganisa, at pagtulong sa serbisyo; hindi ito patunay ng pormal na appointment.",
    en: "The Reference Manual uses the term barangay-level Health Education and Promotion Officer, or HEPO. Teaching, organizing, and service support connect in this role; the diagram does not prove a formal appointment.",
    title_fil: "Magkakaugnay na papel",
    title_en: "Connected roles",
    detail_fil: "HEPO · Pagsusulong ng kalusugan",
    detail_en: "HEPO · Health promotion",
  },
  {
    id: "summary",
    fil: "Bago magbahagi, inaalam ni Riza ang mga prayoridad ng barangay at kinukumpirma sa health worker ang detalyeng hindi tiyak. Tandaan: magturo, pag-ugnayin ang mga tao, at gumabay sa serbisyo nang may tamang kaalaman.",
    en: "Before sharing information, Riza learns the barangay's priorities and confirms uncertain details with a health worker. Remember: educate, connect people, and guide them to services with accurate knowledge.",
    title_fil: "Magturo · Mag-ugnay · Gumabay",
    title_en: "Educate · Connect · Guide",
    detail_fil: "Tamang kaalaman ang pundasyon.",
    detail_en: "Accurate knowledge is the foundation.",
  },
];

export type RolesHepoBeat = BaseRolesHepoBeat & { ceb: string; title_ceb: string; detail_ceb: string; hil: string; title_hil: string; detail_hil: string };
export const ROLES_HEPO_BEATS: RolesHepoBeat[] = baseBeats.map((beat, index) => {
  const localized = translation.story_beats[index];
  if (localized.id !== beat.id) throw new Error("Cebuano story beat order does not match lesson 1.1.1");
  const ilonggo = hiligaynon.story_beats[index];
  if (ilonggo.id !== beat.id) throw new Error("Hiligaynon story beat order does not match lesson 1.1.1");
  return { ...beat, ceb: localized.text, title_ceb: localized.title, detail_ceb: localized.detail,
    hil: ilonggo.text, title_hil: ilonggo.title, detail_hil: ilonggo.detail };
});

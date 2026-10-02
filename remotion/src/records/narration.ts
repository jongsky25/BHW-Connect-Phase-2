// Short companion animation for BHW lesson 1.1.5. These are fictional
// examples, not official forms or instructions for handling real records.
// Narration is rendered once per language and committed with beat timings.

export type RecordsBeat = {
  id: string;
  fil: string;
  en: string;
  title_fil: string;
  title_en: string;
  detail_fil: string;
  detail_en: string;
};

export const RECORDS_BEATS: RecordsBeat[] = [
  {
    id: "question",
    fil: "Pagkatapos kausapin si Aling Nena, tinanong ni Riza ang midwife kung anong impormasyong kailangan.",
    en: "After speaking with Aling Nena, Riza asks the midwife what information is needed.",
    title_fil: "Anong tala ang kailangan?",
    title_en: "Which record is needed?",
    detail_fil: "Alamin muna ang tanong.",
    detail_en: "Start with the question.",
  },
  {
    id: "household",
    fil: "Ang household profile ay naglalarawan ng isang kabahayan. Hindi ito patunay na may serbisyong naibigay.",
    en: "A household profile describes one household. It does not prove that a service was given.",
    title_fil: "Household profile",
    title_en: "Household profile",
    detail_fil: "Ano ang larawan ng kabahayan?",
    detail_en: "What describes the household?",
  },
  {
    id: "master-list",
    fil: "Ang master list ay nagsasabi kung sino ang kabilang sa isang grupo. Hindi ito tala ng serbisyong naibigay.",
    en: "A master list shows who belongs to a group. It does not record that a service was given.",
    title_fil: "Master list",
    title_en: "Master list",
    detail_fil: "Sino ang kabilang sa grupo?",
    detail_en: "Who belongs to the group?",
  },
  {
    id: "registry",
    fil: "Ang registry ang titingnan kung sino ang nabigyan ng health teaching. Linawin muna ang hindi tiyak na entry.",
    en: "Check the registry to see who received health teaching. Clarify any uncertain entry first.",
    title_fil: "Registry",
    title_en: "Registry",
    detail_fil: "Sino ang nabigyan ng serbisyo?",
    detail_en: "Who received a service?",
  },
  {
    id: "assigned-form",
    fil: "Sa iniatas na form, tiyakin ang hinihinging detalye at tatanggap. Sundin ang aprubadong lokal na paraan ng pagpapasa.",
    en: "For an assigned form, confirm the requested details and recipient. Follow the approved local handoff route.",
    title_fil: "Iniatas na form",
    title_en: "Assigned form",
    detail_fil: "Ano ang kailangan, at kanino ihahatid?",
    detail_en: "What is needed, and who receives it?",
  },
  {
    id: "summary",
    fil: "Piliin ang tala ayon sa tanong, suriin ang impormasyon, at huwag manghula.",
    en: "Choose the record for the question, check the information, and do not guess.",
    title_fil: "Piliin · Suriin · Ipaabot",
    title_en: "Choose · Check · Hand off",
    detail_fil: "Kathang-isip na halimbawa lamang.",
    detail_en: "Fictional examples only.",
  },
];

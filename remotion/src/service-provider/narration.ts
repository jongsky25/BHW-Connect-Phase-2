// Companion video for the approved lesson 1.1.4 story. It illustrates the
// BHW's listening, scope, guidance, and follow-up without teaching treatment.

export type ServiceProviderBeat = {
  id: string;
  fil: string;
  en: string;
  title_fil: string;
  title_en: string;
  detail_fil: string;
  detail_en: string;
};

export const SERVICE_PROVIDER_BEATS: ServiceProviderBeat[] = [
  {
    id: "first-contact",
    fil: "Lumapit si Aling Nena kay Riza tungkol sa anak niya. Bilang BHW, katuwang si Riza ng midwife sa health team.",
    en: "Aling Nena approaches Riza about her child. As a BHW, Riza works with the midwife in the health team.",
    title_fil: "Unang nilapitan",
    title_en: "First contact",
    detail_fil: "Makinig sa pangangailangan.",
    detail_en: "Hear what help is needed.",
  },
  {
    id: "listen",
    fil: "Nagtanong si Riza kung anong tulong ang kailangan. Pinakinggan niya si Aling Nena at nilinaw ang naunawaan, sa halip na manghula ng sakit.",
    en: "Riza asks what help is needed. She listens and checks what she understood instead of guessing at an illness.",
    title_fil: "Makinig muna",
    title_en: "Listen first",
    detail_fil: "Magtanong · Makinig · Linawin",
    detail_en: "Ask · Listen · Clarify",
  },
  {
    id: "scope",
    fil: "Gagawin lamang ni Riza ang saklaw ng kanyang pagsasanay, lokal na patakaran, at pangangasiwa. Kung hindi tiyak, hihingi siya ng gabay sa midwife.",
    en: "Riza acts only within her training, local policy, and supervision. If she is unsure, she seeks guidance from the midwife.",
    title_fil: "Alamin ang saklaw",
    title_en: "Know your limits",
    detail_fil: "Kapag hindi tiyak, humingi ng gabay.",
    detail_en: "When unsure, seek guidance.",
  },
  {
    id: "guide",
    fil: "Kinumpirma niya ang angkop na health worker o pasilidad. Ipinaliwanag niya kung sino ang kakausapin at paano makakarating doon.",
    en: "She confirms the appropriate health worker or facility. She explains whom to contact and how to get there.",
    title_fil: "Malinaw na hakbang",
    title_en: "A clear next step",
    detail_fil: "Sino ang kakausapin? Paano makakarating?",
    detail_en: "Whom to contact? How to get there?",
  },
  {
    id: "follow-up",
    fil: "Ayon sa tagubilin ng health team, kinumpirma ni Riza kung ano ang itatala, kailan magfo-follow-up, at kanino mag-uulat.",
    en: "Following the health team's instructions, Riza confirms what to record, when to follow up, and whom to update.",
    title_fil: "Mag-follow-up",
    title_en: "Follow through",
    detail_fil: "Ano · Kailan · Kanino",
    detail_en: "What · When · Whom",
  },
  {
    id: "summary",
    fil: "Kung humingi si Aling Nena ng payo sa gamot na lampas sa pagsasanay ni Riza, makikinig siya, hihingi ng gabay, magpapaliwanag ng susunod na hakbang, at magfo-follow-up.",
    en: "If Aling Nena asks for medicine advice beyond Riza's training, Riza listens, seeks guidance, explains the next step, and follows through.",
    title_fil: "Makinig · Humingi ng gabay",
    title_en: "Listen · Seek guidance",
    detail_fil: "Ipaliwanag ang hakbang · Mag-follow-up",
    detail_en: "Explain the step · Follow through",
  },
];

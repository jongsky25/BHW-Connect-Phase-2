export type EnvironmentBeat = {
  id: string; fil: string; en: string;
  title_fil: string; title_en: string; detail_fil: string; detail_en: string;
};

export const BHS_SUPPORT_ENVIRONMENT_BEATS: EnvironmentBeat[] = [
  {
    id: "welcome",
    fil: "May tanong sa breastfeeding ang magulang. Nakikinig si BHW Mimi. Dalawang paksa: magalang na suporta at ligtas na pagbabawas ng basura.",
    en: "A parent asks about breastfeeding. BHW Mimi listens. Two topics: respectful support and safe reduction of unnecessary waste.",
    title_fil: "Suportadong BHS", title_en: "A supportive BHS",
    detail_fil: "Dalawang paksa, ligtas na kapaligiran.", detail_en: "Two topics, a safe environment.",
  },
  {
    id: "roles",
    fil: "May mga tuntunin sa lactation stations ang RA 10028. Institusyon ang responsable. Kukumpirmahin ni Mimi ang lokal na lugar at sinanay na contact.",
    en: "RA 10028 sets rules for lactation stations. The institution is responsible. Mimi confirms the local space and trained contact.",
    title_fil: "Linawin ang papel", title_en: "Make the roles clear",
    detail_fil: "Institusyon: pasilidad. BHW: kumpirmasyon.", detail_en: "Institution: facilities. BHW: confirmation.",
  },
  {
    id: "connect",
    fil: "Igalang ang privacy at pasya ng magulang. Sa pahintulot niya, iugnay sa nakumpirmang suporta. Huwag magbigay ng sariling clinical advice.",
    en: "Respect the parent's privacy and choice. With permission, connect them to confirmed support. Do not offer personal clinical advice.",
    title_fil: "Makinig at iugnay", title_en: "Listen and connect",
    detail_fil: "Privacy · pahintulot · sinanay na suporta", detail_en: "Privacy · permission · trained support",
  },
  {
    id: "waste",
    fil: "Nililimitahan ng DOH circular ang hindi kailangang single-use plastics sa tinukoy na mga lugar. May phased coverage. Tiyakin ang kasalukuyang direktiba.",
    en: "The DOH circular limits unnecessary single-use plastics in specified settings, with phased coverage. Confirm the current directive.",
    title_fil: "Hindi kailangang plastic", title_en: "Unnecessary plastic",
    detail_fil: "Tinukoy na gamit · saklaw · lokal na direktiba", detail_en: "Listed items · scope · local directive",
  },
  {
    id: "alternative",
    fil: "Itanong sa supervisor ang reusable na lalagyan ng baon sa break area. Huwag kusang mag-alis o mag-reuse ng sterile o kinakailangang clinical supplies.",
    en: "Ask the supervisor about reusable lunch containers in the break area. Never independently remove or reuse sterile or necessary clinical supplies.",
    title_fil: "Supervisor muna", title_en: "Supervisor first",
    detail_fil: "Non-clinical na alternatibo; ligtas na pangangalaga.", detail_en: "A non-clinical alternative; safe care.",
  },
  {
    id: "summary",
    fil: "Makinig, kumpirmahin, umalalay. Igalang ang magulang; tiyakin ang lokal na suporta. Bawasan ang hindi kailangang basura ayon sa gabay. Ligtas na pangangalaga muna.",
    en: "Listen, confirm, support. Respect the parent and confirm local support. Reduce unnecessary waste according to guidance. Safe care comes first.",
    title_fil: "Makinig. Tiyakin. Umalalay.", title_en: "Listen. Confirm. Support.",
    detail_fil: "Magalang na suporta + ligtas na pagbabawas ng basura", detail_en: "Respectful support + safe waste reduction",
  },
];

export type EnvironmentBeat = {
  id: string; fil: string; en: string;
  title_fil: string; title_en: string; detail_fil: string; detail_en: string;
};

export const BHS_SUPPORT_ENVIRONMENT_BEATS: EnvironmentBeat[] = [
  {
    id: "welcome",
    fil: "May tanong ang magulang tungkol sa breastfeeding. Nakinig si BHW Mimi. Dalawang paksa ang haharapin niya: magalang na suporta at ligtas na pagbabawas ng hindi kailangang basura.",
    en: "A parent has a question about breastfeeding. BHW Mimi listens. She will address two topics: respectful support and safe reduction of unnecessary waste.",
    title_fil: "Suportadong BHS", title_en: "A supportive BHS",
    detail_fil: "Dalawang paksa, ligtas na kapaligiran.", detail_en: "Two topics, a safe environment.",
  },
  {
    id: "roles",
    fil: "Itinatakda ng RA 10028 ang lactation stations ayon sa mga tuntunin nito. Institusyon ang responsable. Kukumpirmahin ni Mimi ang lokal na lugar at sinanay na contact; hindi siya mangangako.",
    en: "RA 10028 requires lactation stations under its rules. The institution is responsible. Mimi confirms the local space and trained contact; she makes no unverified promise.",
    title_fil: "Linawin ang papel", title_en: "Make the roles clear",
    detail_fil: "Institusyon: pasilidad. BHW: kumpirmasyon.", detail_en: "Institution: facilities. BHW: confirmation.",
  },
  {
    id: "connect",
    fil: "Magtatanong si Mimi nang may paggalang at privacy. Sa pahintulot ng magulang, iuugnay niya ito sa nakumpirmang sinanay na suporta. Hindi niya ipipilit ang feeding choice o sariling clinical advice.",
    en: "Mimi asks respectfully and protects privacy. With the parent's permission, she connects them to confirmed trained support. She imposes no feeding choice or personal clinical advice.",
    title_fil: "Makinig at iugnay", title_en: "Listen and connect",
    detail_fil: "Privacy · pahintulot · sinanay na suporta", detail_en: "Privacy · permission · trained support",
  },
  {
    id: "waste",
    fil: "Tungkol ang DOH DC 2021-0486 sa hindi kailangang single-use plastics sa mga tinukoy na health facilities at DOH offices. May phased coverage ito. Tiyakin ang kasalukuyang gabay; hindi lahat ng plastic ay bawal saanman.",
    en: "DOH DC 2021-0486 addresses unnecessary single-use plastics in specified health facilities and DOH offices, with phased coverage. Check current guidance; it is not a ban on every plastic item everywhere.",
    title_fil: "Hindi kailangang plastic", title_en: "Unnecessary plastic",
    detail_fil: "Tinukoy na gamit · saklaw · lokal na direktiba", detail_en: "Listed items · scope · local directive",
  },
  {
    id: "alternative",
    fil: "Itatanong ni Mimi sa supervisor ang reusable na lalagyan ng baon sa break area. Non-clinical na halimbawa ito. Huwag mag-alis o mag-reuse ng sterile o kinakailangang clinical supplies nang kusa.",
    en: "Mimi asks the supervisor about reusable lunch containers in the break area, a non-clinical example. Never independently remove or reuse sterile or necessary clinical supplies.",
    title_fil: "Supervisor muna", title_en: "Supervisor first",
    detail_fil: "Non-clinical na alternatibo; ligtas na pangangalaga.", detail_en: "A non-clinical alternative; safe care.",
  },
  {
    id: "summary",
    fil: "Makinig, kumpirmahin, saka umalalay. Igalang ang magulang at pangalagaan ang privacy. Tiyakin ang suporta at ligtas na alternatibo kasama ang supervisor. Hindi dapat manaig ang pagtitipid sa ligtas na pangangalaga.",
    en: "Listen, confirm, then help. Respect the parent and protect privacy. Confirm support and safe alternatives with the supervisor. Saving resources must not override safe care.",
    title_fil: "Makinig. Tiyakin. Umalalay.", title_en: "Listen. Confirm. Support.",
    detail_fil: "Magalang na suporta + ligtas na pagbabawas ng basura", detail_en: "Respectful support + safe waste reduction",
  },
];

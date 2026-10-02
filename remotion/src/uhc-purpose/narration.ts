// Companion animation for lesson 1.2.1. The fictional conversation illustrates
// a distinction in the UHC Act, not a promise about one facility or benefit.

export type UhcPurposeBeat = {
  id: string;
  fil: string;
  en: string;
  title_fil: string;
  title_en: string;
  detail_fil: string;
  detail_en: string;
};

export const UHC_PURPOSE_BEATS: UhcPurposeBeat[] = [
  {
    id: "question",
    fil: "Sa barangay health station, tinanong ni Mang Ernesto si BHW Vlanche: Libre na ba ang konsulta? Nakinig muna siya bago sumagot.",
    en: "At the barangay health station, Mang Ernesto asks BHW Vlanche if consultations are free now. She listens before answering.",
    title_fil: "Libre na ba ang konsulta?",
    title_en: "Is the consultation free?",
    detail_fil: "Makinig muna sa tanong.",
    detail_en: "Listen to the question first.",
  },
  {
    id: "purpose",
    fil: "Layunin ng UHC Act na mapalapit ang dekalidad at abot-kayang pangangalaga at maprotektahan ang mga tao laban sa mabigat na gastusin.",
    en: "The UHC Act aims to bring affordable, quality care within reach and protect people from financial hardship.",
    title_fil: "Layunin ng UHC",
    title_en: "UHC's aim",
    detail_fil: "Serbisyong maaabot · proteksiyon sa gastusin",
    detail_en: "Access to care · financial protection",
  },
  {
    id: "included",
    fil: "Sa ilalim ng batas, awtomatikong kasama ang bawat Pilipinong mamamayan sa National Health Insurance Program ng PhilHealth.",
    en: "Under the law, every Filipino citizen is automatically included in PhilHealth's National Health Insurance Program.",
    title_fil: "Awtomatikong kasama",
    title_en: "Automatically included",
    detail_fil: "Sino ang kasama sa programa?",
    detail_en: "Who is included in the program?",
  },
  {
    id: "benefit",
    fil: "Ang pagiging kasama sa programa ay hindi nangangahulugang libre ang bawat serbisyo sa bawat pasilidad. Iba ang tanong kung sakop ang partikular na konsulta.",
    en: "Being included in the program does not mean every service is free at every facility. Coverage for a particular consultation is a separate question.",
    title_fil: "Kasama ≠ lahat ay libre",
    title_en: "Included ≠ everything is free",
    detail_fil: "Tiyakin ang partikular na serbisyo.",
    detail_en: "Check the particular service.",
  },
  {
    id: "verify",
    fil: "Titingnan ni Vlanche sa PhilHealth o RHU ang benepisyo, kinikilalang provider o pasilidad, at kailangang hakbang para sa konsultang ito.",
    en: "Vlanche checks the benefit, recognized provider or facility, and required steps for this consultation with PhilHealth or the RHU.",
    title_fil: "Benepisyo · provider · hakbang",
    title_en: "Benefit · provider · steps",
    detail_fil: "Alamin ang kasalukuyang lokal na proseso.",
    detail_en: "Confirm the current local process.",
  },
  {
    id: "answer",
    fil: "Sinabi ni Vlanche: Kasama po kayo sa PhilHealth. Para malaman kung sakop ang konsultang ito rito, tiyakin natin ang benepisyo, provider, at dapat gawin.",
    en: "Vlanche says: You are included in PhilHealth. To know whether this consultation is covered here, let us check the benefit, provider, and next step.",
    title_fil: "Sabihin ang alam · tiyakin ang detalye",
    title_en: "Explain what is known · check the details",
    detail_fil: "Walang pangakong libre nang walang pagtitiyak.",
    detail_en: "No promise of a free visit without checking.",
  },
];

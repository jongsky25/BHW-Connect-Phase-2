// Companion animation for the approved 1.1.3 Community Organizer lesson.
// The story distinguishes observation from an unverified cause and shows
// participation and the local planning route without promising funding.

export type CommunityOrganizerBeat = {
  id: string;
  fil: string;
  en: string;
  title_fil: string;
  title_en: string;
  detail_fil: string;
  detail_en: string;
};

export const COMMUNITY_ORGANIZER_BEATS: CommunityOrganizerBeat[] = [
  {
    id: "observe",
    fil: "Napansin ni BHW Marites ang naipong tubig sa tatlong bakuran. Kinausap niya ang mga residente at nagtanong kung ano rin ang napansin nila.",
    en: "BHW Marites notices standing water in three yards. She speaks with residents and asks what they have noticed too.",
    title_fil: "Mula sa nakita",
    title_en: "Start with what you saw",
    detail_fil: "Makinig sa mga residente.",
    detail_en: "Listen to residents.",
  },
  {
    id: "invite",
    fil: "Inanyayahan ni Marites ang mga residente, purok leader, at health staff sa usapan. May nagmungkahi ng ibang oras; pinakinggan niya iyon bago sila pumili ng oras.",
    en: "Marites invites residents, the purok leader, and health staff to talk. Someone suggests another time; she listens before they choose a time together.",
    title_fil: "Anyayahang makilahok",
    title_en: "Invite participation",
    detail_fil: "Makibagay sa mungkahi ng residente.",
    detail_en: "Let residents shape the plan.",
  },
  {
    id: "verify",
    fil: "Isinulat ni Marites ang nakita: may naipong tubig sa tatlong bakuran. Hindi niya sinabing iyon ang sanhi ng pagkakasakit ng mga bata, dahil hindi pa iyon napatunayan.",
    en: "Marites records what she saw: standing water in three yards. She does not claim it caused children to become ill, because that has not been established.",
    title_fil: "Nakita, hindi hinala",
    title_en: "Seen, not assumed",
    detail_fil: "Ibahagi ang tiyak na obserbasyon.",
    detail_en: "Share the specific observation.",
  },
  {
    id: "plan",
    fil: "Kasama ang mga residente at health staff, tinukoy niya kung sino ang magdadala ng usapin sa barangay planning team for health at kung sino ang magbabalik ng sagot. Kumpirmahin ang aktuwal na proseso sa lokal na health team.",
    en: "With residents and health staff, she identifies who will bring the concern to the barangay planning team for health and who will report back. Confirm the actual route with the local health team.",
    title_fil: "Dalhin sa pagpaplano",
    title_en: "Bring it into planning",
    detail_fil: "May magdadala at magbabalik ng sagot.",
    detail_en: "Name a representative and a response.",
  },
  {
    id: "liph",
    fil: "Maaaring makatulong ang ambag ng barangay sa pagtalakay para sa Local Investment Plan for Health, o LIPH. Dumaraan ito sa umiiral na lokal na proseso; hindi garantisado ang pondo.",
    en: "Barangay input may inform discussion for the Local Investment Plan for Health, or LIPH. It goes through the existing local process; funding is not guaranteed.",
    title_fil: "Mas malawak na plano",
    title_en: "A wider plan",
    detail_fil: "Ambag sa LIPH; walang pangakong pondo.",
    detail_en: "Input to LIPH; no funding promise.",
  },
  {
    id: "summary",
    fil: "Bilang Community Organizer, nakikinig si Marites, pinag-uugnay ang mga tao, iniuulat ang nakita sa halip na ang hinala, at sinusundan ang lokal na proseso hanggang may maibalik na sagot sa mga residente.",
    en: "As a Community Organizer, Marites listens, connects people, reports what was seen rather than assumed, and follows the local process until residents receive a response.",
    title_fil: "Makinig · Pag-ugnayin",
    title_en: "Listen · Connect",
    detail_fil: "Iulat ang nakita · Magbalik ng sagot",
    detail_en: "Report what was seen · Report back",
  },
];

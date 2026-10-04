export type LocalSystemBeat = {
  id: string; fil: string; en: string;
  title_fil: string; title_en: string;
  detail_fil: string; detail_en: string;
};

export const LOCAL_SYSTEM_BEATS: LocalSystemBeat[] = [
  {id: "question",
    fil: "Tanong ni Mang Ernesto: Saan po makukumpirma ang impormasyon sa health activity? Narinig din ito ni Vlanche sa ibang residente. Nakinig muna siya.",
    en: "Mang Ernesto asks: Where can we confirm the health activity information? Vlanche has heard the same question from other residents. First, she listens.",
    title_fil: "Paulit-ulit na tanong", title_en: "A recurring question",
    detail_fil: "Makinig. Alamin ang hindi pa tiyak.", detail_en: "Listen. Identify what is uncertain."},
  {id: "roles",
    fil: "Pinangangasiwaan ng Provincial at City Health Boards ang UHC integration. Hindi awtomatikong kasapi ang BHW. Kukunin ni Vlanche sa health team ang angkop na lokal na contact.",
    en: "Provincial and City Health Boards oversee UHC integration. A BHW is not automatically a member. Vlanche asks the health team for the appropriate local contact.",
    title_fil: "Magkaibang papel", title_en: "Distinct roles",
    detail_fil: "Board: integration. BHW: obserbasyon at pakikipag-ugnayan.", detail_en: "Board: integration. BHW: observation and coordination."},
  {id: "observation",
    fil: "Ibinubuod niya ang narinig: Paulit-ulit ang tanong, magkaiba ang impormasyon, at kailangan pang kumpirmahin ang detalye. Walang pangalan o personal na health detail sa buod.",
    en: "She summarises what she heard: a recurring question, conflicting information, and details still to confirm. The summary has no names or personal health details.",
    title_fil: "Malinaw na obserbasyon", title_en: "A factual observation",
    detail_fil: "Narinig · hindi pa tiyak · tanong", detail_en: "Observed · uncertain · question"},
  {id: "promotion",
    fil: "Bilang barangay HEPO, titiyakin ni Vlanche sa team ang mensahe. Ipaliliwanag niya ito nang payak, mag-aanyaya ng tanong, at susuriin ang pagkaunawa ng residente.",
    en: "As a barangay HEPO, Vlanche checks the message with the team. She explains it simply, invites questions, and checks the resident’s understanding.",
    title_fil: "Tumpak na mensahe", title_en: "An accurate message",
    detail_fil: "Tiyakin · ipaliwanag · suriin", detail_en: "Check · explain · check understanding"},
  {id: "discussion",
    fil: "Nagpraktis siya kasama ang midwife. Sino po ang makapagkukumpirma at tatanggap ng mungkahi? Sino ang may pasya? Hindi niya ipinangakong aprubado na ang ideya.",
    en: "She practises with the midwife: Who can confirm and receive the suggestion? Who can decide? She does not promise that her idea is approved.",
    title_fil: "Talakayin sa team", title_en: "Discuss with the team",
    detail_fil: "Tiyak na tanong. Malinaw na hangganan.", detail_en: "A specific question. A clear boundary."},
  {id: "feedback",
    fil: "Napagkasunduan nila kung kailan at paano mag-follow-up. Nakumpirmang tugon lamang ang ibabahagi niya. Obserbasyon, tumpak na mensahe, pakikipag-ugnayan at follow-up ang ambag ng BHW.",
    en: "They agree when and how to follow up. She will share only confirmed feedback. The BHW contributes observation, accurate messaging, coordination and follow-up.",
    title_fil: "Sundan ang napagkasunduan", title_en: "Follow the agreed step",
    detail_fil: "Obserbasyon · mensahe · follow-up", detail_en: "Observation · message · follow-up"}
];

export type ClarificationText = { en: string; fil: string };
export type ContentClarification = {
  id: string;
  title: ClarificationText;
  explanation: ClarificationText;
  points: ClarificationText[];
  practice: ClarificationText;
  response: ClarificationText;
  source: { label: string; href: string };
};

export const clarificationVersion = "pilot-1 · 2026-10-24";
export const contentClarifications: ContentClarification[] = [
  {
    id: "bhw-role",
    title: { en: "Your role when checking BHW service", fil: "Papel mo sa pagsuri ng serbisyo bilang BHW" },
    explanation: {
      en: "The learner is the BHW checking service information or helping someone ask the right office. You are not being asked to act as a supervisor, certify service, approve eligibility or appoint someone.",
      fil: "Ikaw ang BHW na nagsusuri ng impormasyon tungkol sa serbisyo o tumutulong magtanong sa tamang tanggapan. Hindi hinihinging gumanap ka bilang supervisor, magpatunay ng serbisyo, mag-apruba ng eligibility o magtalaga sa trabaho.",
    },
    points: [
      { en: "Total years of service and service that meets the applicable accredited-service requirements are different questions.", fil: "Magkaiba ang kabuuang taon ng serbisyo at serbisyong pasok sa naaangkop na accredited-service requirements." },
      { en: "Ask the supervisor or RHU for the appropriate record-verification route, and check current Civil Service Commission (CSC) requirements.", fil: "Itanong sa supervisor o RHU ang tamang paraan ng pagtiyak ng mga tala, at alamin ang kasalukuyang requirements ng Civil Service Commission (CSC)." },
      { en: "A long service count alone does not establish eligibility or guarantee a government appointment.", fil: "Hindi sapat ang mahabang serbisyo lamang upang matiyak ang eligibility o magarantiyahan ang appointment sa gobyerno." },
    ],
    practice: { en: 'In a fictional practice case, BHW Lina says: “My service dates are unclear. Do I have to approve my own record?” What can she do within her role?', fil: 'Sa kathang practice case, sabi ni BHW Lina: “Hindi malinaw ang petsa ng serbisyo ko. Ako ba ang mag-aapruba ng sarili kong tala?” Ano ang maaari niyang gawin bilang BHW?' },
    response: { en: "Lina can ask the appropriate supervisor or RHU contact to help verify the records and identify which current CSC requirements apply. She does not approve her own service certification or promise eligibility.", fil: "Maaaring humingi si Lina ng tulong sa kinauukulang supervisor o RHU contact upang matiyak ang mga tala at ang naaangkop na kasalukuyang CSC requirements. Hindi siya ang mag-aapruba ng sariling service certification o mangangako ng eligibility." },
    source: { label: "CSC: Barangay Health Worker Eligibility", href: "https://csc.gov.ph/special-eligibilities/barangay-health-worker-eligibility" },
  },
  {
    id: "problem-analysis",
    title: { en: "Investigate barriers before ranking solutions", fil: "Suriin ang mga hadlang bago magranggo ng solusyon" },
    explanation: {
      en: "The manual's example and the teaching-deck scores are learning examples. A high example score for training does not prove that training is the main cause of a child's death or the highest priority in every barangay. Investigate connected barriers before choosing a response.",
      fil: "Mga halimbawa sa pag-aaral ang kaso sa manual at ang mga score sa teaching deck. Hindi patunay ang mataas na sample score sa training na ito ang pangunahing sanhi ng pagkamatay ng bata o laging pinakamataas na prayoridad sa bawat barangay. Suriin muna ang magkakaugnay na hadlang bago pumili ng tugon.",
    },
    points: [
      { en: "Safe water: is a safe, usable supply actually accessible? Teaching preparation alone does not establish access.", fil: "Ligtas na tubig: may talagang naaabot at nagagamit bang ligtas na suplay? Hindi natitiyak ang access sa pagtuturo lamang ng paghahanda." },
      { en: "Income and transport: what costs, travel or timing barriers were reported, and what evidence can confirm them?", fil: "Kita at transportasyon: anong gastos, biyahe o oras ang naiulat na hadlang, at anong ebidensiya ang maaaring magpatunay?" },
      { en: "Services and information: which services and messages were available, received and understood? Keep unknown causes open.", fil: "Serbisyo at impormasyon: anong serbisyo at mensahe ang magagamit, natanggap at naunawaan? Panatilihing bukas ang mga sanhing hindi pa tiyak." },
      { en: "The example totals 19, 17 and 16 are fictional practice scores. Use local evidence for real planning; urgent care must not wait for scoring.", fil: "Mga kathang practice score ang halimbawang kabuuang 19, 17 at 16. Gumamit ng lokal na ebidensiya sa tunay na pagpaplano; huwag ipaghintay sa scoring ang agarang pangangalaga." },
    ],
    practice: { en: "A fictional group sees a training row ranked first and concludes that families only need a water-preparation lecture. What is missing?", fil: "Nakita ng isang kathang pangkat na una ang training sa sample ranking at sinabing lecture sa paghahanda ng tubig lang ang kailangan ng pamilya. Ano ang kulang?" },
    response: { en: "The group still needs evidence about water supply, costs, transport, service access and information. Label what is reported, verified or still to check. Do not blame a family or treat one example ranking as a local finding.", fil: "Kailangan pa ng pangkat ang ebidensiya tungkol sa suplay ng tubig, gastos, transportasyon, access sa serbisyo at impormasyon. Lagyan ng label kung iniulat, natiyak o kailangan pang suriin. Huwag sisihin ang pamilya o ituring na lokal na resulta ang isang sample ranking." },
    source: { label: "DOH Reference Manual, PDF pp. 20–21 (transcription)", href: "https://github.com/jongsky25/BHW-Connect-Phase-2/blob/6c5e05ab16c0290072c6c67e6ed8ad56436b76b3/docs/source-material/day1-basic-competencies/bhw-reference-manual.md" },
  },
  {
    id: "network-referral",
    title: { en: "A provider network and a referral are different", fil: "Magkaiba ang provider network at referral" },
    explanation: {
      en: "A health care provider network is a coordinated group of providers across levels of care. A referral concerns a person's next care step when another provider or service is needed. The primary care provider helps navigate and coordinate care within the network.",
      fil: "Ang health care provider network ay magkakaugnay na pangkat ng mga provider sa iba't ibang antas ng pangangalaga. Ang referral ay tungkol sa susunod na hakbang ng isang tao kapag kailangan ang ibang provider o serbisyo. Tumutulong ang primary care provider sa paggabay at pag-uugnay ng pangangalaga sa network.",
    },
    points: [
      { en: '“Which providers work together?” asks about the network. “Who will assess the need for another service, and what is the current local process?” asks about referral.', fil: 'Tungkol sa network ang “Aling mga provider ang magkakaugnay?” Tungkol sa referral ang “Sino ang susuri kung kailangan ang ibang serbisyo, at ano ang kasalukuyang lokal na proseso?”' },
      { en: "The BHW checks the current local contact and instructions with the responsible health professional. The clinical decision belongs to the appropriate health professional.", fil: "Tinitiyak ng BHW ang kasalukuyang lokal na contact at tagubilin sa kinauukulang health professional. Ang naaangkop na health professional ang nagpapasya tungkol sa klinikal na pangangalaga." },
      { en: "Do not promise facility acceptance, coverage or a service before checking. Follow the local urgent-care procedure when needed.", fil: "Huwag mangako ng pagtanggap ng pasilidad, coverage o serbisyo bago tiyakin. Sundin ang lokal na paraan para sa agarang pangangalaga kung kailangan." },
    ],
    practice: { en: "In a fictional discussion, Sam asks which clinics and hospitals coordinate care. Pat asks how to follow a clinician's instruction for another service. Are they asking the same thing?", fil: "Sa kathang talakayan, tinanong ni Sam kung aling mga klinika at ospital ang nag-uugnayan sa pangangalaga. Tinanong ni Pat kung paano susundin ang tagubilin ng clinician para sa ibang serbisyo. Pareho ba ang tanong nila?" },
    response: { en: "Sam asks about the provider network. Pat asks about the referral process for a particular care step. Explain the distinction, then verify the relevant local information with the health team.", fil: "Tungkol sa provider network ang tanong ni Sam. Tungkol sa proseso ng referral para sa isang hakbang sa pangangalaga ang tanong ni Pat. Ipaliwanag ang pagkakaiba at tiyakin ang kaugnay na lokal na impormasyon sa health team." },
    source: { label: "RA 11223, section 4(l), (r)–(s)", href: "https://lawphil.net/statutes/repacts/ra2019/ra_11223_2019.html" },
  },
  {
    id: "benefits",
    title: { en: "Check the particular BHW benefit", fil: "Tiyakin ang partikular na benepisyo ng BHW" },
    explanation: {
      en: "RA 7883 provides different benefit categories with their own conditions and responsible authorities. Accreditation is not a promise that every BHW automatically receives every benefit at an identical amount in every barangay.",
      fil: "May iba't ibang uri ng benepisyo ang RA 7883, na may kanya-kanyang kondisyon at kinauukulang awtoridad. Hindi pangako ang accreditation na awtomatikong matatanggap ng bawat BHW ang lahat ng benepisyo sa parehong halaga sa bawat barangay.",
    },
    points: [
      { en: "Start by naming the benefit. Hazard allowance and subsistence allowance have different conditions; not every benefit is a cash payment.", fil: "Unahin ang pangalan ng benepisyo. Magkaiba ang kondisyon ng hazard allowance at subsistence allowance; hindi lahat ng benepisyo ay bayad na pera." },
      { en: "Section 4 requires registration with the local health board where service is rendered. Check the benefit's specific conditions and responsible authority as well.", fil: "Hinihingi ng section 4 ang registration sa local health board kung saan naglilingkod. Tiyakin din ang partikular na kondisyon at kinauukulang awtoridad para sa benepisyo." },
      { en: "Section 7 provides for local health board review and approval when local funds are used. Ask about the applicable process and amount; delayed receipt does not prove a BHW did something wrong.", fil: "Itinatakda ng section 7 ang review at approval ng local health board kapag lokal na pondo ang ginagamit. Itanong ang naaangkop na proseso at halaga; hindi patunay ng pagkakamali ng BHW ang pagkaantala ng pagtanggap." },
    ],
    practice: { en: "A fictional BHW group hears that one allowance is the same everywhere. What should they ask before sharing the claim?", fil: "Narinig ng isang kathang pangkat ng BHW na pareho ang isang allowance saanman. Ano ang dapat nilang itanong bago ibahagi ang pahayag?" },
    response: { en: "Ask which allowance is meant, which eligibility and registration conditions apply, who verifies them, and what current approval and amount apply. Share the verified answer without promising a payment.", fil: "Itanong kung anong allowance ang tinutukoy, anong eligibility at registration conditions ang naaangkop, sino ang magtitiyak nito, at anong kasalukuyang approval at halaga ang umiiral. Ibahagi ang natiyak na sagot nang hindi nangangako ng bayad." },
    source: { label: "RA 7883, sections 4, 6–7", href: "https://lawphil.net/statutes/repacts/ra1995/ra_7883_1995.html" },
  },
];

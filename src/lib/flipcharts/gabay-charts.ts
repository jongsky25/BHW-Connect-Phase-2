// Versioned P3 packet. The pilot admin approved these charts on 2026-09-29;
// live visibility still depends on deployment and the flipcharts feature flag.
export type GabayPage = {
  image: string;
  alt: { fil: string; en: string };
  caption: { fil: string; en: string };
  notes: { fil: string; en: string };
  claims: string[];
};

export type GabayChart = {
  slug: string;
  title: { fil: string; en: string };
  review: "draft" | "approved";
  reviewedAt: string | null;
  pages: GabayPage[];
};

const page = (image: string, altFil: string, altEn: string, captionFil: string, captionEn: string,
  notesFil: string, notesEn: string, claims: string[]): GabayPage => ({
  image: `/gabay-flipcharts/${image}.svg`, alt: { fil: altFil, en: altEn },
  caption: { fil: captionFil, en: captionEn }, notes: { fil: notesFil, en: notesEn }, claims,
});

export const gabayCharts: GabayChart[] = [
  {
    slug: "yakap", title: { fil: "YAKAP: Alaga Mula sa Unang Konsulta", en: "YAKAP: Care from the First Consultation" },
    review: "approved", reviewedAt: "2026-09-29",
    pages: [
      page("yakap-clinic", "Residente na pumipili ng accredited clinic.", "Resident choosing an accredited clinic.",
        "Pumili ng accredited YAKAP clinic na maaabot mo.", "Choose an accredited YAKAP clinic you can reach.",
        "May PIN na po ba kayo? Tingnan natin ang kasalukuyang accredited list at opisyal na paraan ng pagpili. Kung walang internet, PhilHealth office ang isang ruta.",
        "Do you have a PIN? Let us check the current accredited list and official selection route. A PhilHealth office is an option when internet is unavailable.",
        ["PH-02", "PH-03", "PH-04", "PH-05"]),
      page("yakap-consult", "Residente na nakikipag-usap sa clinician sa clinic.", "Resident speaking with a clinician at a clinic.",
        "Pumunta sa clinic para sa unang FPE; itanong ang susunod na konsultasyon.", "Visit the clinic for the FPE; ask how consultation follows.",
        "Sa FPE, kinukuha o ina-update ang pangunahing health data. Hindi pa ito konsultasyon. Ipaliwanag na ang clinician ang magpapasya sa angkop na susunod na pangangalaga.",
        "The FPE takes or updates basic health data. It is not yet a consultation. Explain that a clinician decides appropriate subsequent care.", ["PH-03", "PH-06"]),
      page("yakap-followup", "Clinic, kalendaryo ng follow-up, at pabalik na daan.", "Clinic, follow-up calendar, and a return path.",
        "Sundin ang payo sa follow-up at bumalik kung kailangan.", "Follow the care plan and return when advised.",
        "Itanong kung saan at kailan siya babalik. Huwag mangako ng isang test, referral, o gamot bago ang assessment.",
        "Ask where and when the resident will return. Do not promise a test, referral, or medicine before assessment.", ["PH-01", "PH-06", "BHW-01"]),
    ],
  },
  {
    slug: "gamot", title: { fil: "GAMOT: Mula Reseta Hanggang Botika", en: "GAMOT: From Prescription to Pharmacy" },
    review: "approved", reviewedAt: "2026-09-29",
    pages: [
      page("gamot-consult", "Clinician na nakikinig sa pasyente.", "Clinician listening to a patient.",
        "Magpakonsulta para masuri ang kailangan mong gamot.", "Consult a clinician to assess which medicine you need.",
        "Huwag hulaan ang gamot mula sa sintomas o litrato ng kahon. Ang clinician ang sasagot sa angkop na gamot at dosis.",
        "Do not infer a medicine from symptoms or a box photo. The clinician answers suitability and dose questions.", ["PH-06", "PH-07"]),
      page("gamot-prescription", "Reseta sa pagitan ng clinician at pasyente, na walang pangalan ng gamot.", "Prescription between clinician and patient, with no named medicine.",
        "Sundin ang angkop na resetang ibinigay ayon sa kasalukuyang tuntunin.", "Follow the appropriate prescription under current rules.",
        "Ipaliwanag na kailangan ang wastong reseta para sa dispensing pathway. Huwag gumawa o baguhin ang reseta.",
        "Explain that the applicable prescription is part of the dispensing pathway. Do not create or change it.", ["PH-07"]),
      page("gamot-facility", "Residente na nagtatanong sa accredited dispensing counter.", "Resident asking at an accredited dispensing counter.",
        "Kumpirmahin sa accredited facility ang pagkuha at availability.", "Confirm dispensing and availability with an accredited facility.",
        "Tingnan ang kasalukuyang accredited list; tumawag o magtanong tungkol sa stock. Para sa sakop, bayad, o problema sa pagkuha, itanong sa pasilidad o PhilHealth.",
        "Check the current accredited list; call or ask about stock. Ask the facility or PhilHealth about coverage, charges, or access problems.", ["PH-05", "PH-07", "PH-09"]),
    ],
  },
  {
    slug: "rehistro", title: { fil: "Rehistro: Aling Hakbang ang Kailangan?", en: "Registration: Which Step Do You Need?" },
    review: "approved", reviewedAt: "2026-09-29",
    pages: [
      page("rehistro-clarify", "Tanong ng residente na may dalawang posibleng daan: PIN o clinic.", "Resident's question branching to a PIN or a clinic.",
        "PIN o rekord ba, o pagpili ng YAKAP clinic?", "PIN or record, or YAKAP clinic selection?",
        "Ito ang unang tanong sa ‘paano magparehistro.’ Huwag agad magbigay ng hakbang hangga't hindi malinaw ang kailangan.",
        "Ask this first when someone says ‘how do I register.’ Do not choose a path before the task is clear.", ["PH-02", "PH-03"]),
      page("rehistro-pin", "Residente na nagtatanong sa opisyal na PhilHealth desk.", "Resident asking at an official PhilHealth desk.",
        "Kung wala o hindi tiyak ang PIN, sa opisyal na PhilHealth channel magtanong.", "If your PIN is absent or uncertain, ask through an official PhilHealth channel.",
        "Ang detalyadong membership application o pagwawasto ng rekord ay gagawin sa PhilHealth channel. Ang residente mismo ang gagamit ng login at one-time code.",
        "Detailed membership application or record correction stays in the PhilHealth channel. The resident uses their own login and one-time code.", ["PH-02", "BHW-02"]),
      page("rehistro-selection", "Residente na pumipili ng accredited clinic bago ang unang konsulta.", "Resident choosing an accredited clinic before a first consultation.",
        "Kung may PIN na, pumili ng accredited YAKAP clinic sa kasalukuyang opisyal na paraan.", "If you have a PIN, choose an accredited YAKAP clinic through a current official channel.",
        "Ipakita ang kasalukuyang channel at clinic list. Para sa dependent o transfer, tiyakin muna ang partikular na proseso sa PhilHealth. Itanong sa residente kung ano ang una niyang gagawin.",
        "Show the current channel and clinic list. For a dependent or transfer, first verify the specific PhilHealth process. Ask the resident to repeat the first step.",
        ["PH-03", "PH-04", "PH-05", "PH-08", "BHW-01"]),
    ],
  },
];

export const gabaySources: Record<string, { label: string; url: string }[]> = {
  "PH-01": [{ label: "PhilHealth YAKAP", url: "https://www.philhealth.gov.ph/yakap/" }],
  "PH-02": [{ label: "YAKAP steps", url: "https://www.philhealth.gov.ph/yakap/YakapSteps.pdf" }],
  "PH-03": [
    { label: "YAKAP patient guide", url: "https://www.philhealth.gov.ph/yakap/MgaDapatMalamanSaPhilHealthYAKAP.pdf" },
    { label: "PhilHealth Circular 2025-0017", url: "https://www.philhealth.gov.ph/circulars/2025/PC2025-0017.pdf" },
    { label: "PhilHealth Circular 2026-0007", url: "https://www.philhealth.gov.ph/circulars/2026/PC2026-0007.pdf" },
  ],
  "PH-04": [{ label: "PhilHealth Advisory 2026-0019", url: "https://www.philhealth.gov.ph/advisories/2026/PA2026-0019.pdf" }],
  "PH-05": [{ label: "Accredited facilities", url: "https://www.philhealth.gov.ph/partners/providers/facilities/accredited/" }],
  "PH-06": [{ label: "YAKAP FAQ", url: "https://www.philhealth.gov.ph/yakap/YAKAP_FAQs.pdf" }],
  "PH-07": [
    { label: "PhilHealth Circular 2025-0013", url: "https://www.philhealth.gov.ph/circulars/2025/PC2025-0013.pdf" },
    { label: "PhilHealth Circular 2026-0002", url: "https://www.philhealth.gov.ph/circulars/2026/PC2026-0002.pdf" },
  ],
  "PH-08": [
    { label: "YAKAP FAQ", url: "https://www.philhealth.gov.ph/yakap/YAKAP_FAQs.pdf" },
    { label: "PhilHealth Circular 2025-0017", url: "https://www.philhealth.gov.ph/circulars/2025/PC2025-0017.pdf" },
  ],
  "PH-09": [
    { label: "YAKAP patient guide", url: "https://www.philhealth.gov.ph/yakap/MgaDapatMalamanSaPhilHealthYAKAP.pdf" },
    { label: "PhilHealth contact", url: "https://www.philhealth.gov.ph/about_us/" },
  ],
};

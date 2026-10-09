// Fictional adaptation; encoded narration determines beat boundaries.
export const SAFETY_CONTROLS_BEATS = [
  {
    "id": "sharps",
    "fil": "Kathang-isip na halimbawa: napansin ni Apple ang fill line. Ihihinto ang apektadong gawain; walang pagsiksik o ordinaryong basura.",
    "en": "Fictional example: Apple notices the fill line. Pause the affected task; never compress contents or use ordinary waste.",
    "title_fil": "Ihinto muna",
    "title_en": "Pause first",
    "detail_fil": "Fill line → awtorisadong kapalit",
    "detail_en": "Fill line → authorized replacement"
  },
  {
    "id": "infection",
    "fil": "Piliin ang kontrol ayon sa ruta: kamay, bentilasyon, ligtas na basura at iwas-kagat. Hindi kapalit ng hand hygiene ang gloves.",
    "en": "Choose controls for the route: hands, ventilation, safe waste and bite prevention. Gloves do not replace hand hygiene.",
    "title_fil": "Piliin ayon sa ruta",
    "title_en": "Choose for the route",
    "detail_fil": "Kamay • bentilasyon • iwas-kagat",
    "detail_en": "Hands • ventilation • bite prevention"
  },
  {
    "id": "body",
    "fil": "Ayusin ang bag, upuan at gamit. Humingi ng tulong, magpahinga at iulat ang sakit; huwag pilitin ang masakit na galaw.",
    "en": "Adjust bag, chair and supplies. Seek help, take breaks and report pain; do not force painful movement.",
    "title_fil": "Ayusin ang gawain",
    "title_en": "Adjust the work",
    "detail_fil": "Bag • upuan • tulong",
    "detail_en": "Bag • chair • assistance"
  },
  {
    "id": "workload",
    "fil": "Sabi ni Apple, “Pagod na ako; kailangan ng suporta at ligtas na ruta.” Tiyakin ang alternatibo; hindi dagdag na oras ang default na kontrol.",
    "en": "Apple says, “I am exhausted; I need support and a safe route.” Verify the alternative; extra hours are not the default control.",
    "title_fil": "Sabihin ang limitasyon",
    "title_en": "State the limit",
    "detail_fil": "Workload • pahinga • ligtas na ruta",
    "detail_en": "Workload • rest • safe route"
  },
  {
    "id": "practice",
    "fil": "Limang pares: sharps, infection, katawan, stress at aksidente. Itama ang maling kontrol. Kapag kulang ang mahalagang proteksyon, ihinto at humingi ng pagwawasto.",
    "en": "Five pairs: sharps, infection, body, stress and accidents. Correct mismatched controls. If essential protection is missing, pause and seek correction.",
    "title_fil": "Ipares at ulitin",
    "title_en": "Match and retry",
    "detail_fil": "Limang grupo • dalawang mismatch",
    "detail_en": "Five groups • two mismatches"
  },
  {
    "id": "check",
    "fil": "Pinagtugma ni Apple ang panganib at kontrol at humingi ng awtorisadong kapalit. Babalik lamang kapag natiyak ang pagwawasto; kung hindi pa tiyak, manatiling nakahinto.",
    "en": "Apple matches the hazard to the control and requests authorized replacement. Resume only after verified correction; if uncertain, keep the task paused.",
    "title_fil": "Tiyakin bago bumalik",
    "title_en": "Verify before resuming",
    "detail_fil": "Awtorisadong pagwawasto muna",
    "detail_en": "Authorized correction first"
  }
] as const;

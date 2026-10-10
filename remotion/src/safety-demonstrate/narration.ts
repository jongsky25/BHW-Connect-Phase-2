// Fictional adaptation; boundaries are measured from encoded audio.
export const SAFETY_DEMONSTRATE_BEATS = [
  {
    "id": "exposure",
    "title_fil": "Kumilos agad",
    "title_en": "Act immediately",
    "detail_fil": "Sabon/tubig → report → evaluation",
    "detail_en": "Wash → report → evaluation",
    "fil": "Sa kathang-isip na simulation, sinabi ni Apple: sabon at tubig, agarang report at medical evaluation. Huwag hintayin ang sintomas.",
    "en": "In fictional practice, Apple states: soap and water, immediate reporting and medical evaluation. Do not wait for symptoms."
  },
  {
    "id": "return-demo",
    "title_fil": "Dummy demo sa trainer",
    "title_en": "Dummy demo with trainer",
    "detail_fil": "Reviewed checklist lamang",
    "detail_en": "Reviewed checklist only",
    "fil": "Ipinakita ni Apple ang puwesto at fill line ng dummy box sa trainer. Hand hygiene at PPE ay ayon sa reviewed local checklist.",
    "en": "Apple shows the dummy box position and fill line to the trainer. Hand hygiene and PPE follow the reviewed local checklist."
  },
  {
    "id": "near-miss",
    "title_fil": "Iulat ang muntikang insidente",
    "title_en": "Report the near miss",
    "detail_fil": "Hazard • oras • lugar • control",
    "detail_en": "Hazard • time • place • control",
    "fil": "Muntik madulas si Apple sa kunwaring daanan. Walang injury o exposure. Iniulat niya ang oras, lugar, hazard at aktuwal na control.",
    "en": "Apple nearly slips on the simulated walkway. No injury or exposure occurs. She reports time, place, hazard and actual control."
  },
  {
    "id": "care-before-paperwork",
    "title_fil": "Care bago papeles",
    "title_en": "Care before paperwork",
    "detail_fil": "Kumpirmahin ang contact at ruta",
    "detail_en": "Verify contact and route",
    "fil": "Kumpirmahin ang reporting contact at ruta sa qualified evaluation. Huwag hayaang maantala ng forms ang care. Provider ang magpapasya sa paggamot.",
    "en": "Confirm the reporting contact and route to qualified evaluation. Forms must not delay care. A provider decides treatment."
  },
  {
    "id": "practice",
    "title_fil": "Feedback at ligtas na retry",
    "title_en": "Feedback and safe retry",
    "detail_fil": "Trainer observation kailangan",
    "detail_en": "Trainer observation required",
    "fil": "Magpalitan ng tatlong role, mag-feedback at ulitin nang ligtas. Hindi naobserbahan ay hindi passed; hindi kapalit ang solo rehearsal.",
    "en": "Rotate three roles, give feedback and retry safely. Unobserved is not passed; solo rehearsal does not replace observation."
  },
  {
    "id": "check",
    "title_fil": "Naobserbahang ligtas na response",
    "title_en": "Observed safe response",
    "detail_fil": "Agarang care; documentation kasunod",
    "detail_en": "Immediate care; document later",
    "fil": "Sa simulation, nakita ng trainer ang ligtas na dummy demo at agarang reporting at evaluation pathway ni Apple. Documentation kasunod ng care; walang ipinapangakong medical outcome.",
    "en": "In simulation, the trainer sees Apple’s safe dummy demonstration and immediate reporting and evaluation pathway. Documentation follows care; no medical outcome is promised."
  }
] as const;

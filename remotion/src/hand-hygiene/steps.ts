// The handrub sequence taught by Chapter 2.3's hand-hygiene lesson
// (content/training/chapter2-common-competencies/drafts/03-infection-control/
// lessons/hand-hygiene), following the step order of the WHO "How to
// handrub" poster that lesson already cites as `who-rub`. Labels are
// bilingual on screen, the same convention as the lesson's own SVG, so one
// muted file serves both locales. The lesson asset's alt text repeats these
// steps in full; keep the two in step if either changes.

export type HandrubMotion =
  | "apply"
  | "palm-to-palm"
  | "palm-over-back"
  | "interlaced"
  | "backs-of-fingers"
  | "thumbs"
  | "fingertips"
  | "dry";

export type HandrubStep = {
  motion: HandrubMotion;
  fil: string;
  en: string;
  // Shown under the label when the step is done on each hand in turn.
  switchHands: boolean;
};

export const HANDRUB_STEPS: HandrubStep[] = [
  {
    motion: "apply",
    fil: "Maglagay ng sapat na handrub sa nakakurbang palad",
    en: "Apply a palmful of handrub in a cupped hand",
    switchHands: false,
  },
  {
    motion: "palm-to-palm",
    fil: "Kuskusin ang palad sa palad",
    en: "Rub palm to palm",
    switchHands: false,
  },
  {
    motion: "palm-over-back",
    fil: "Palad sa likod ng kabilang kamay, magkasalikop ang daliri",
    en: "Palm over the back of the other hand, fingers interlaced",
    switchHands: true,
  },
  {
    motion: "interlaced",
    fil: "Palad sa palad, magkasalikop ang daliri",
    en: "Palm to palm, fingers interlaced",
    switchHands: false,
  },
  {
    motion: "backs-of-fingers",
    fil: "Likod ng mga daliri sa kabilang palad, magkakawit",
    en: "Backs of fingers to the opposite palm, fingers interlocked",
    switchHands: false,
  },
  {
    motion: "thumbs",
    fil: "Ikutin ang hinlalaki sa loob ng kabilang palad",
    en: "Rotate each thumb clasped in the other palm",
    switchHands: true,
  },
  {
    motion: "fingertips",
    fil: "Ikutin ang dulo ng mga daliri sa kabilang palad",
    en: "Rub the fingertips in circles on the other palm",
    switchHands: true,
  },
  {
    motion: "dry",
    fil: "Kuskusin hanggang matuyo — huwag punasan",
    en: "Keep rubbing until dry — do not wipe",
    switchHands: false,
  },
];

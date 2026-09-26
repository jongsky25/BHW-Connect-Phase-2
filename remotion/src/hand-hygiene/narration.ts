// Narration script for the Chapter 2.3 handrub clip (docs/handrub-clip-
// enhancement-handoff.md §3). Owner-approved 26 September 2026. One short
// sentence per beat: an intro, the eight WHO handrub steps (following the
// on-screen wording in ./steps.ts), and a closing line.
//
// The closing line exists because the narrated clip runs longer than a real
// handrub: the lesson teaches 20-30 seconds, and the clip must not let the
// pacing imply otherwise (see the handoff doc's "traps").
//
// Read by scripts/remotion-narrate.mjs (Gemini synthesis) and by
// HandrubSteps.tsx (frame counts derived from the synthesized audio's
// timings, via calculateMetadata). `id` must stay in this exact order and
// match HANDRUB_STEPS' step order one-for-one.

export type HandrubNarrationBeat = {
  id: string;
  fil: string;
  en: string;
};

export const HANDRUB_NARRATION: HandrubNarrationBeat[] = [
  {
    id: "intro",
    fil: "Handrub: walong hakbang lang, dalawampu hanggang tatlumpung segundo, sasaklaw sa lahat ng bahagi ng magkabilang kamay.",
    en: "Handrub: eight steps, twenty to thirty seconds, covering every surface of both hands.",
  },
  {
    id: "step-apply",
    fil: "Una, maglagay ng sapat na handrub sa nakakurbang palad.",
    en: "First, apply a palmful of handrub in a cupped hand.",
  },
  {
    id: "step-palm-to-palm",
    fil: "Kuskusin ang palad sa palad.",
    en: "Rub palm to palm.",
  },
  {
    id: "step-palm-over-back",
    fil: "Ilagay ang palad sa likod ng kabilang kamay, magkasalikop ang daliri. Ulitin sa kabilang kamay.",
    en: "Palm over the back of the other hand, fingers interlaced. Repeat on the other hand.",
  },
  {
    id: "step-interlaced",
    fil: "Palad sa palad, magkasalikop ang daliri.",
    en: "Palm to palm, fingers interlaced.",
  },
  {
    id: "step-backs-of-fingers",
    fil: "Ilagay ang likod ng mga daliri sa kabilang palad, magkakawit.",
    en: "Backs of fingers to the opposite palm, fingers interlocked.",
  },
  {
    id: "step-thumbs",
    fil: "Ikutin ang hinlalaki sa loob ng kabilang palad. Ulitin sa kabilang kamay.",
    en: "Rotate each thumb clasped in the other palm. Repeat on the other hand.",
  },
  {
    id: "step-fingertips",
    fil: "Ikutin ang dulo ng mga daliri sa kabilang palad. Ulitin sa kabilang kamay.",
    en: "Rub the fingertips in circles on the other palm. Repeat on the other hand.",
  },
  {
    id: "step-dry",
    fil: "Panghuli, patuloy na kuskusin hanggang matuyo — huwag punasan.",
    en: "Finally, keep rubbing until dry — do not wipe.",
  },
  {
    id: "closing",
    fil: "Tandaan: sa totoong buhay, dalawampu hanggang tatlumpung segundo lang ang buong handrub — hindi kasing-haba ng video na ito.",
    en: "Remember: in real life, the complete handrub takes only twenty to thirty seconds — not as long as this video.",
  },
];

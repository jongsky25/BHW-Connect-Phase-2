// Plain-JS port of src/lib/elearning/narration-zones.ts, kept in sync by
// hand — the same split svg-allowlist.ts/.mjs already uses, since a .mjs
// loader script cannot import a .ts file without a build step (Node 22 has
// no stable type-stripping). scripts/tts-render.mjs uses buildNarrationZones
// to know exactly what text to synthesize and in what order; the renderer
// (lesson-narration.tsx) must produce the identical ordered list from the
// same section text for its highlighted spans to line up with the persisted
// `timings[i]` this script writes. Each side has its own test file
// (narration-zones.test.ts / narration-zones.test.mjs) so drift between the
// two shows up as a difference in what each accepts, not a silent gap.

export function splitIntoSentences(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  return (matches ?? [normalized]).map((sentence) => sentence.trim()).filter(Boolean);
}

export function buildNarrationZones(section) {
  const zones = [];

  const heading = section.heading.trim();
  if (heading) zones.push({ zone: "heading", index: 0, text: heading });

  splitIntoSentences(section.body).forEach((sentence, index) => {
    zones.push({ zone: "body", index, text: sentence });
  });

  const takeaway = section.takeaway.trim();
  if (takeaway) zones.push({ zone: "takeaway", index: 0, text: takeaway });

  return zones;
}

// INC-27 (docs/training-modules-plan.md). Shared between the renderer
// (lesson-narration.tsx) and the loader's plain-JS port
// (scripts/lib/narration-zones.mjs, kept in sync by hand — same split as
// svg-allowlist.ts/.mjs, since a .mjs script cannot import a .ts file
// without a build step). Both sides must derive the exact same ordered
// zone list from the exact same section text, because that ordering is
// what lines up scripts/tts-render.mjs's persisted `timings[i]` with the
// span the renderer highlights at that index — there is no other key
// linking them.
//
// Deliberately a plain regex split, no NLP library: "sentence" here only
// needs to be good enough for read-along highlighting granularity, not
// grammatically exact, and a wrong split degrades gracefully (the
// zone-count/text mismatch check in lesson-narration.tsx falls back to an
// unhighlighted render rather than mis-highlighting).

export type NarrationZoneKind = "heading" | "body" | "takeaway";

export type NarrationZone = {
  zone: NarrationZoneKind;
  index: number;
  text: string;
};

export function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  // Lossless: every character lands in exactly one sentence. A sentence ends
  // at . ! or ? (plus any closing quote or bracket) before a space or the
  // end, so `hindi "kailan?" kundi` is never dropped the way a split that
  // required whitespace straight after the punctuation silently did.
  const matches = normalized.match(/.+?[.!?]+["'”’)\]]*(?=\s|$)|.+$/g);
  return (matches ?? [normalized]).map((sentence) => sentence.trim()).filter(Boolean);
}

export function buildNarrationZones(section: {
  heading: string;
  body: string;
  takeaway: string;
}): NarrationZone[] {
  const zones: NarrationZone[] = [];

  const heading = section.heading.trim();
  if (heading) zones.push({ zone: "heading", index: 0, text: heading });

  splitIntoSentences(section.body).forEach((sentence, index) => {
    zones.push({ zone: "body", index, text: sentence });
  });

  const takeaway = section.takeaway.trim();
  if (takeaway) zones.push({ zone: "takeaway", index: 0, text: takeaway });

  return zones;
}

// Binary search for the last timing whose start_ms <= currentMs — the
// sentence currently playing (timings are stored in playback order, so
// start_ms is monotonically increasing). Returns -1 before the first
// timing starts or when there are no timings at all.
export function findActiveTimingIndex(
  timings: Array<{ start_ms: number }>,
  currentMs: number,
): number {
  let lo = 0;
  let hi = timings.length - 1;
  let answer = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timings[mid].start_ms <= currentMs) {
      answer = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return answer;
}

// INC-28: the highest body-sentence index playback has reached so far, -1
// before the first body sentence starts. Renderer-only (an animated scene's
// build-up is a display concern, not something the loader/tts-render.mjs
// side ever needs), so unlike the rest of this file it has no scripts/lib
// mirror.
export function bodyIndexFromActive(zones: NarrationZone[], activeIndex: number): number {
  let last = -1;
  for (let i = 0; i <= activeIndex && i < zones.length; i++) {
    if (zones[i].zone === "body") last = zones[i].index;
  }
  return last;
}

// True when `timings` (as persisted on a CourseModuleAudio row) is exactly
// the narration the CURRENT section text would produce — i.e. the audio
// was rendered from this exact text. False means the content changed
// since the audio was last rendered; the caller should treat the section
// as if it had no audio at all rather than highlight the wrong spans.
export function timingsMatchSection(
  timings: Array<{ zone: NarrationZoneKind; index: number; text: string }>,
  section: { heading: string; body: string; takeaway: string },
): boolean {
  const zones = buildNarrationZones(section);
  if (zones.length !== timings.length) return false;
  return zones.every(
    (zone, i) =>
      zone.zone === timings[i].zone &&
      zone.index === timings[i].index &&
      zone.text === timings[i].text,
  );
}

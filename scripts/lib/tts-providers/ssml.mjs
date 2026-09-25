// Shared SSML builder for both TTS providers (INC-27,
// docs/training-modules-plan.md). A <bookmark mark="..."/> is placed right
// after each narration zone's text — this is what gives exact per-zone
// timing, rather than relying on either engine's own sentence-boundary
// detection to happen to land on our zone boundaries (a heading like "Ang
// UHC Act" has no terminal punctuation at all, so a sentence-boundary event
// would never fire there). Both Azure Neural TTS and the edge-tts voice
// catalog (same underlying Microsoft speech platform) support the
// <bookmark> element; xml-escaping matters because authored content can
// contain apostrophes/ampersands (e.g. "Aling Nena's").

function escapeXml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const LANG_TAG = { fil: "fil-PH", en: "en-US" };

export function buildSsml(zones, { voice, language }) {
  const body = zones
    .map((zone, i) => `${escapeXml(zone.text)}<bookmark mark="zone-${i}"/>`)
    .join(" ");
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${LANG_TAG[language]}">` +
    `<voice name="${voice}">${body}</voice>` +
    `</speak>`
  );
}

// Turns a flat, ordered list of { markName, offsetMs } bookmark events (one
// per zone, in zone order — both providers guarantee this ordering, since
// bookmarks fire in the order they appear in the SSML) plus the audio's
// total duration into the zones' start_ms/end_ms.
export function timingsFromBookmarks(zones, bookmarkOffsetsMs, totalDurationMs) {
  return zones.map((zone, i) => ({
    zone: zone.zone,
    index: zone.index,
    text: zone.text,
    start_ms: i === 0 ? 0 : bookmarkOffsetsMs[i - 1],
    end_ms: bookmarkOffsetsMs[i] ?? totalDurationMs,
  }));
}

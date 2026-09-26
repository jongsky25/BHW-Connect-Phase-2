// Captions for a narrated clip, built from the same per-beat timings
// (scripts/remotion-narrate.mjs) that pace the composition, so each cue
// starts exactly when its narration does. Cue text is the displayed
// narration text, not the spokenText the voice was sent.

const stamp = (ms) => {
  const total = Math.max(0, Math.round(ms));
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(total % 1000, 3)}`;
};

export function toWebVtt(timings) {
  const cues = timings.beats.map((b, i) => {
    const text = b.text.replace(/\s+/g, " ").trim();
    if (!text) throw new Error(`webvtt: beat ${b.zone ?? i} has no text`);
    if (!(b.end_ms > b.start_ms)) throw new Error(`webvtt: beat ${b.zone ?? i} has no duration`);
    return `${i + 1}\n${stamp(b.start_ms)} --> ${stamp(b.end_ms)}\n${text}`;
  });
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

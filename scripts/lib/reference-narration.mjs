// Read-mode narration for converted Reference Manual lessons (subchapters
// with a lessons/ folder). Audio is keyed by lesson key + stable section ID +
// language + a hash of the exact narrated text and voice, never by a
// positional index, and lives outside the immutable lesson revision: adding
// or re-rendering narration never changes an approved revision hash.
//
// Each narration zone (heading, each body sentence, takeaway — the same
// ordered list src/lib/elearning/narration-zones.ts builds in the browser) is
// synthesized separately. The MP3 frames are then concatenated, so every
// zone's start/end time is exact frame arithmetic rather than an estimate.
// No I/O happens here; the CLI (scripts/training-narrate.mjs) injects it.

import { createHash } from "node:crypto";
import { buildNarrationZones } from "./narration-zones.mjs";
import { computeContentHash } from "./tts-render-core.mjs";

export const NARRATION_VOICES = { fil: "fil-PH-BlessicaNeural", en: "en-PH-RosaNeural" };
export const AUDIO_ROOT = "/training/audio";
// Bump when spokenText changes so existing audio is re-rendered.
export const SPEECH_RULES = "speech-v2";

// English letter names spelled for the Filipino voice. Given "BHW" or
// "B H W" it reads a word or Spanish-style letters; these spellings make it
// say "bee-aitch-double-u" like the English voice (checked by transcribing
// the synthesized audio).
const FILIPINO_LETTER_NAMES = {
  A: "ey", B: "bi", C: "si", D: "di", E: "i", F: "ef", G: "dyi", H: "eych", I: "ay",
  J: "dyey", K: "key", L: "el", M: "em", N: "en", O: "o", P: "pi", Q: "kyu", R: "ar",
  S: "es", T: "ti", U: "yu", V: "vi", W: "dobolyu", X: "eks", Y: "way", Z: "zi",
};
const ROMAN_NUMERALS = { II: "2", III: "3" };

// Any run of two or more capitals is an acronym and is spelled letter by
// letter in both languages (BHW -> B H W, HEPO -> H E P O). A trailing
// plural or possessive s (BHWs, BHW's, BHWs') stays attached.
export function spellAcronyms(text, language) {
  return text.replace(/(?<![A-Za-z])([A-Z]{2,})(s['’]?|['’]s)?(?![A-Za-z])/g, (whole, letters, suffix) => {
    if (!suffix && ROMAN_NUMERALS[letters]) return ROMAN_NUMERALS[letters];
    if (language === "fil") return [...letters].map((c) => FILIPINO_LETTER_NAMES[c]).join("-") + (suffix ? "s" : "");
    return [...letters].join(" ") + (suffix ? "'s" : "");
  });
}

// What the voice reads for a zone. Zones keep the displayed text (the browser
// rebuilds them from the revision to align highlighting); markdown emphasis
// markers are removed, a slash between words (CHO/MHO, midwife/RHU) is read
// as "or", and acronyms are spelled out.
export const spokenText = (text, language) =>
  spellAcronyms(
    text.replace(/\*\*/g, "").replace(/(?<=[A-Za-z])\/(?=[A-Za-z])/g, language === "fil" ? " o " : " or "),
    language,
  )
    .replace(/\s+/g, " ")
    .trim();

const L3_BITRATES = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

function frameAt(bytes, offset) {
  if (offset + 4 > bytes.length || bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) return null;
  const version = (bytes[offset + 1] >> 3) & 3; // 3 MPEG-1, 2 MPEG-2, 0 MPEG-2.5
  const layer = (bytes[offset + 1] >> 1) & 3; // 1 = Layer III
  if (version === 1 || layer !== 1) return null;
  const bitrate = L3_BITRATES[version === 3 ? 1 : 2][(bytes[offset + 2] >> 4) & 0xf];
  const sampleRate = SAMPLE_RATES[version]?.[(bytes[offset + 2] >> 2) & 3];
  if (!bitrate || !sampleRate) return null;
  const padding = (bytes[offset + 2] >> 1) & 1;
  const mpeg1 = version === 3;
  const length = Math.floor(((mpeg1 ? 144 : 72) * bitrate * 1000) / sampleRate) + padding;
  return { offset, length, sampleRate, samples: mpeg1 ? 1152 : 576 };
}

// Layer III audio frames of one clip, without a leading ID3v2 tag and
// without the Xing/Info header frame. That frame records the frame count of
// its own clip only; left in a concatenation it makes some players report
// the first sentence's length as the whole file's duration.
export function mp3AudioFrames(bytes) {
  let offset = 0;
  if (bytes.length >= 10 && bytes.toString("latin1", 0, 3) === "ID3") {
    const size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    offset = 10 + size;
  }
  const frames = [];
  while (offset < bytes.length) {
    const frame = frameAt(bytes, offset);
    if (!frame || frame.offset + frame.length > bytes.length) break;
    frames.push(frame);
    offset += frame.length;
  }
  if (offset !== bytes.length) throw new Error(`unparseable MP3 data at byte ${offset} of ${bytes.length}`);
  if (frames.length) {
    const first = bytes.subarray(frames[0].offset, frames[0].offset + frames[0].length).toString("latin1");
    if (first.includes("Xing") || first.includes("Info")) frames.shift();
  }
  if (!frames.length) throw new Error("MP3 clip contains no audio frames");
  if (new Set(frames.map((f) => f.sampleRate)).size !== 1) throw new Error("MP3 clip mixes sample rates");
  return frames.map((f) => ({ ...f, data: bytes.subarray(f.offset, f.offset + f.length) }));
}

// clips[i] is the synthesized MP3 for zones[i]. Returns one continuous MP3
// plus timings in the LessonAudioTiming shape the renderer consumes.
export function assembleNarration(zones, clips) {
  if (zones.length !== clips.length) throw new Error("one clip is required per narration zone");
  const parts = [];
  const timings = [];
  let sampleRate = null;
  let samples = 0;
  zones.forEach((zone, i) => {
    const frames = mp3AudioFrames(clips[i]);
    sampleRate ??= frames[0].sampleRate;
    if (frames[0].sampleRate !== sampleRate) throw new Error("narration clips must share one sample rate");
    const start = samples;
    for (const frame of frames) {
      parts.push(frame.data);
      samples += frame.samples;
    }
    timings.push({
      zone: zone.zone,
      index: zone.index,
      text: zone.text,
      start_ms: Math.round((start * 1000) / sampleRate),
      end_ms: Math.round((samples * 1000) / sampleRate),
    });
  });
  return { bytes: Buffer.concat(parts), timings, durationSeconds: Math.round((samples / sampleRate) * 1000) / 1000 };
}

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function narrationSrc(moduleKey, lessonKey, sectionId, language, contentHash) {
  return `${AUDIO_ROOT}/${moduleKey}/${lessonKey}/${sectionId}.${language}.${contentHash.slice(0, 12)}.mp3`;
}

/**
 * @param {Array<{key: string, lessons: Array}>} modules - { key, lessons } where
 *   lessons come from loadReferenceModule(...).lessons
 * @param {object} manifest - the current narration manifest
 * @param {(src: string) => string | null} fileHash - sha256 of a public file, or null if missing
 */
export function planReferenceNarration(modules, manifest, fileHash) {
  const items = [];
  for (const { key: moduleKey, lessons } of modules) {
    for (const lesson of lessons) {
      const lessonKey = lesson.manifest.lesson_key;
      for (const section of lesson.revision.read_sections) {
        for (const language of /** @type {const} */ (["fil", "en"])) {
          const zones = buildNarrationZones({
            heading: section[`heading_${language}`],
            body: section[`body_${language}`],
            takeaway: section[`takeaway_${language}`],
          });
          if (!zones.length) continue;
          const voice = NARRATION_VOICES[language];
          const contentHash = computeContentHash(zones, `${voice}|${SPEECH_RULES}`);
          const src = narrationSrc(moduleKey, lessonKey, section.id, language, contentHash);
          const existing = manifest.lessons?.[lessonKey]?.sections?.[section.id]?.[language];
          const current =
            existing?.content_hash === contentHash && existing.src === src && fileHash(src) === existing.sha256;
          items.push({
            moduleKey,
            lessonKey,
            sectionId: section.id,
            language,
            voice,
            zones,
            contentHash,
            src,
            action: current ? "skip" : "render",
            existing: current ? existing : null,
            charCount: zones.reduce((n, z) => n + z.text.length, 0),
          });
        }
      }
    }
  }
  return items;
}

// Rebuilds manifest entries for every planned lesson from rendered/kept
// results, drops lessons of the processed modules that no longer exist, and
// leaves other modules' entries untouched.
export function buildManifest(previous, modules, results) {
  const processed = new Set(modules.map((m) => m.key));
  const lessons = Object.fromEntries(
    Object.entries(previous.lessons ?? {}).filter(([, entry]) => !processed.has(entry.module)),
  );
  for (const r of results) {
    const lesson = (lessons[r.lessonKey] ??= { module: r.moduleKey, sections: {} });
    (lesson.sections[r.sectionId] ??= {})[r.language] = {
      src: r.src,
      voice: r.voice,
      content_hash: r.contentHash,
      sha256: r.sha256,
      duration_seconds: r.durationSeconds,
      timings: r.timings,
    };
  }
  const sorted = Object.fromEntries(Object.keys(lessons).sort().map((k) => [k, lessons[k]]));
  return { format: "mp3", voices: NARRATION_VOICES, lessons: sorted };
}

export function referencedSources(manifest) {
  const sources = new Set();
  for (const lesson of Object.values(manifest.lessons ?? {}))
    for (const section of Object.values(lesson.sections))
      for (const entry of Object.values(section)) sources.add(entry.src);
  return sources;
}

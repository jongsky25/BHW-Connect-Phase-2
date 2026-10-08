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

import {communicationRecordStyle, communicationRecordSpokenText} from "./communication-record-speech.mjs";
import { applyWordPronunciations } from "./narration-pronunciation.mjs";
import { createHash } from "node:crypto";
import { buildNarrationZones } from "./narration-zones.mjs";
import { computeContentHash } from "./tts-render-core.mjs";
import { communicationListenStyle, BHW_SELF_MANAGEMENT_STORY_STYLES, BHW_RIGHT_CONTACT_STORY_STYLES, BHW_TEAMWORK_STORY_STYLES, BHW_RELATIONSHIPS_STORY_STYLES, BHW_BARANGAY_PARTNERS_STORY_STYLES, BHW_LOCAL_PARTNERS_STORY_STYLES } from "./tts-providers/gemini.mjs";
import { BHW_FOLLOW_UP_STORY_STYLES, BHW_ACCREDITATION_FIL_STEADY_STYLE, BHW_ACCREDITATION_STORY_STYLES, BHW_ELIGIBILITY_STORY_STYLES, BHW_BENEFITS_STORY_STYLES, BHW_LEGAL_ROLE_STORY_STYLES, geminiVoiceId, BHS_IMPROVEMENT_STORY_STYLES, BHS_RESOURCES_STORY_STYLES, BHS_DECLINE_STORY_STYLES, BHS_SUPPORT_ENVIRONMENT_STORY_STYLES, BHS_PROMOTIONS_STORY_STYLES, LOCAL_SYSTEM_STORY_STYLES, UHC_IMPROVEMENT_STORY_STYLES, PRIMARY_CARE_STORY_STYLES, ROLES_APPLICATION_STORY_STYLES, ORGANIZER_STORY_STYLES, RECORDS_STORY_STYLES, SERVICE_PROVIDER_STORY_STYLES, UHC_COVERAGE_STORY_STYLES } from "./tts-providers/gemini.mjs";

export const NARRATION_VOICES = { fil: "fil-PH-BlessicaNeural", en: "en-PH-RosaNeural" };
// Gemini narration is re-encoded to 32 kbps mono, the content standard's cap.
export const GEMINI_NARRATION_KBPS = 32;
// Voice per provider and language. The voice string is part of the content
// hash (and so of the file name): switching provider re-renders a section.
export const PROVIDER_VOICES = {
  edge: NARRATION_VOICES,
  gemini: { fil: geminiVoiceId(), en: geminiVoiceId() },
};
export const providerOfVoice = (voice) => (voice?.startsWith("gemini:") ? "gemini" : "edge");
const hashVoice = (provider, voice, speechStyle) =>
  provider === "gemini" ? `${voice}|${SPEECH_RULES}|mp3-${GEMINI_NARRATION_KBPS}k-resampled${speechStyle ? `|${speechStyle}` : ""}` : `${voice}|${SPEECH_RULES}`;
export const AUDIO_ROOT = "/training/audio";
// General speech rules; word exceptions are versioned separately in computeContentHash.
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

// Known spoken words (including YAKAP, Tagalog for hug) override acronym spelling.
// Other runs of two or more capitals are spelled letter by
// letter in both languages (BHW -> B H W, HEPO -> H E P O). A trailing
// plural or possessive s (BHWs, BHW's, BHWs') stays attached.
export function spellAcronyms(text, language) {
  return applyWordPronunciations(text).replace(/(?<![A-Za-z])([A-Z]{2,})(s['’]?|['’]s)?(?![A-Za-z])/g, (whole, letters, suffix) => {
    if (!suffix && ROMAN_NUMERALS[letters]) return ROMAN_NUMERALS[letters];
    if (language === "fil" || language === "ceb" || language === "hil") return [...letters].map((c) => FILIPINO_LETTER_NAMES[c]).join("-") + (suffix ? "s" : "");
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

// Target-only speech aliases; authored text and browser timing labels stay unchanged.
export const communicationListenSpokenText = (text, language, phonetic = false) =>
  spokenText(text, language).replace(/\bLiza\b/g, phonetic ? "Lee-sah" : "Lisa").replace(/\bGibs\b/g, "Gibz");

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

// Renders one planned item. Synthesizers are injected (the CLI passes the
// real ones; tests pass fakes). Both paths send spokenText but record the
// displayed zone text in timings, which is what timingsMatchSection compares
// against the published revision.
export async function renderNarration(item, { synthesizeUtterance, synthesizeWithGemini, geminiApiKey, fetchImpl }) {
  if (item.provider === "gemini") {
    const audio = await synthesizeWithGemini(item.zones, item.language, {
      apiKey: geminiApiKey,
      kbps: GEMINI_NARRATION_KBPS,
      speak: (zone) => item.lessonKey === "communication-record" ? communicationRecordSpokenText(spokenText(zone.text, item.language)) : item.lessonKey === "communication-listen"
        ? communicationListenSpokenText(zone.text, item.language, item.speechStyle?.includes("Delivery revision 3."))
        : spokenText(zone.text, item.language),
      ...(item.speechStyle ? { style: item.speechStyle } : {}),
      ...(fetchImpl ? { fetchImpl } : {}),
    });
    // The encoder pads the last frame, so the file runs a few ms past the
    // final sentence: record the file's own length, as the Edge path does.
    const frames = mp3AudioFrames(audio.audioBytes);
    const seconds = frames.reduce((n, f) => n + f.samples, 0) / frames[0].sampleRate;
    return { bytes: audio.audioBytes, timings: audio.timings, durationSeconds: Math.round(seconds * 1000) / 1000 };
  }
  const clips = [];
  for (const zone of item.zones) clips.push(await synthesizeUtterance(spokenText(zone.text, item.language), item.voice));
  return assembleNarration(item.zones, clips);
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
 * @param {{ provider?: "edge" | "gemini" }} [options] - with no provider, each
 *   section keeps the provider its current audio used (new sections: edge), so
 *   a plain re-run after a text edit never swaps a re-voiced chapter back.
 */
export function planReferenceNarration(modules, manifest, fileHash, { provider: chosen } = {}) {
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
          const existing = manifest.lessons?.[lessonKey]?.sections?.[section.id]?.[language];
          // New sections of these Gemini stories must preserve their target provider.
          const provider = chosen ?? (["communication-record", "communication-listen", "bhw-self-management", "bhw-right-contact", "bhw-teamwork", "bhw-local-partners", "bhw-barangay-partners", "bhw-relationships", "bhw-follow-up", "bhw-accreditation", "bhw-eligibility", "bhw-benefits", "bhw-legal-role", "bhs-improvement", "bhs-resources", "bhs-decline", "bhs-support-environment", "bhs-promotions", "uhc-local-system", "uhc-improvement"].includes(lessonKey) ? "gemini" : providerOfVoice(existing?.voice));
          const voice = PROVIDER_VOICES[provider][language];
          const speechStyle = provider === "gemini"
            ? lessonKey === "communication-record" ? communicationRecordStyle(language) : lessonKey === "communication-listen" ? communicationListenStyle(language, section.id) : lessonKey === "bhw-self-management" ? BHW_SELF_MANAGEMENT_STORY_STYLES[language] : lessonKey === "bhw-right-contact" ? BHW_RIGHT_CONTACT_STORY_STYLES[language] + ((language === "en" && ["section-11", "section-12", "contact-professional"].includes(section.id) || language === "fil" && section.id === "contact-professional") ? " Keep a settled adult FEMALE narrator in a warm feminine mid register for this entire recording, including its heading and every separately supplied sentence. Do not use a masculine/baritone or announcer voice for headings or prompts. Every request is a continuation by the same Filipina woman, with the same vocal identity and pitch range. No speaker switching or acting out another person. Preserve every word and negation and finish the final instruction clearly." : "") : lessonKey === "bhw-teamwork" ? BHW_TEAMWORK_STORY_STYLES[language] + (language === "fil" && ["teamwork-five-practices", "teamwork-role-agreement"].includes(section.id) ? " Every separately supplied sentence continues exactly the same settled adult female Kore trainer voice. Do not switch to a male, lower or raspier presenter for list introductions or endings. Preserve exact words and every syllable. Pronounce gawain as ga-wa-in, never gagawin; napahintulutan as na-pa-hin-tu-lu-tan; pribasiya as pri-ba-si-ya. Do not replace, shorten or insert words." : "") : lessonKey === "bhw-local-partners" ? BHW_LOCAL_PARTNERS_STORY_STYLES[language] + ((section.id === "local-request" || (section.id === "local-partners-application-check" && language === "en")) ? " Keep every separately synthesized sentence in the identical adult Filipina narrator timbre and mid-register as the heading. This is one continuous woman narrator, with no male or secondary announcer voice. Read the exact words; preserve negations, conditions and complete endings." : "") : lessonKey === "bhw-barangay-partners" ? BHW_BARANGAY_PARTNERS_STORY_STYLES[language] + (language === "fil" && section.id === "barangay-partners-application-check" ? " This entire application screen is narrated by the same warm adult Filipina woman, including its title, scenario, question, instructions and takeaway. Keep the curious question in that same female mid-pitched voice; no male/baritone presenter and no separate quizmaster or character voice. Every separately supplied sentence is a continuation of this single woman trainer. Read tanong sa pagsasanay clearly and end every instruction completely." : "") : lessonKey === "bhw-relationships"
              ? BHW_RELATIONSHIPS_STORY_STYLES[language] + (language === 'en' && ['section-1', 'community-listening'].includes(section.id) ? ' Pronounce Nena as NEH-nah, with the same narrator voice throughout.' : '') + (language === 'fil' && section.id === 'relationships-application-check' ? ' Use a settled adult Filipina woman narrator in a warm mid-pitched register. Read the heading and short opening instruction in that same female register as the scenario and ending; do not lower them to a male or baritone voice. Every separate heading, body and takeaway request belongs to this single narrator. Keep register steady, with gentle instructional cadence and no speaker switching.' : '')
              : lessonKey === "bhw-follow-up"
              ? BHW_FOLLOW_UP_STORY_STYLES[language]
              : lessonKey === "bhw-accreditation"
              ? BHW_ACCREDITATION_STORY_STYLES[language] + (language === "fil" && ["section-5", "accreditation-application-check"].includes(section.id) ? BHW_ACCREDITATION_FIL_STEADY_STYLE : "")
              : lessonKey === "bhw-eligibility"
              ? BHW_ELIGIBILITY_STORY_STYLES[language]
              : lessonKey === "bhw-benefits"
              ? BHW_BENEFITS_STORY_STYLES[language]
              : lessonKey === "bhw-legal-role"
              ? BHW_LEGAL_ROLE_STORY_STYLES[language]
              : lessonKey === "bhs-improvement"
              ? BHS_IMPROVEMENT_STORY_STYLES[language]
              : lessonKey === "bhs-resources"
              ? BHS_RESOURCES_STORY_STYLES[language]
              : lessonKey === "bhs-decline"
              ? BHS_DECLINE_STORY_STYLES[language]
              : lessonKey === "bhs-support-environment"
                ? BHS_SUPPORT_ENVIRONMENT_STORY_STYLES[language]
              : lessonKey === "bhs-promotions"
              ? BHS_PROMOTIONS_STORY_STYLES[language] + (section.id === 'section-2' && language === 'fil' ? ' Say the order number 2015-0053 as twenty fifteen, zero zero five three. Preserve both leading zeros and do not say five five three. Keep DOH and AO as clear individual letters.' : '')
              : lessonKey === "uhc-local-system"
                ? LOCAL_SYSTEM_STORY_STYLES[language]
              : lessonKey === "bhw-community-organizer"
              ? ORGANIZER_STORY_STYLES[language]
              : lessonKey === "bhw-service-provider"
                ? SERVICE_PROVIDER_STORY_STYLES[language]
                : lessonKey === "bhw-records"
                  ? RECORDS_STORY_STYLES[language]
                  : lessonKey === "bhw-roles-application"
                    ? ROLES_APPLICATION_STORY_STYLES[language]
                    : lessonKey === "uhc-primary-care"
                      ? PRIMARY_CARE_STORY_STYLES[language]
                    : lessonKey === "uhc-improvement"
                      ? UHC_IMPROVEMENT_STORY_STYLES[language]
                    : lessonKey === "uhc-coverage"
                    ? UHC_COVERAGE_STORY_STYLES[language]
                : null
            : null;
          const contentHash = computeContentHash(zones, hashVoice(provider, voice, speechStyle));
          const src = narrationSrc(moduleKey, lessonKey, section.id, language, contentHash);
          const current =
            existing?.content_hash === contentHash && existing.src === src && fileHash(src) === existing.sha256;
          items.push({
            moduleKey,
            lessonKey,
            sectionId: section.id,
            language,
            provider,
            voice,
            speechStyle,
            zones,
            contentHash,
            src,
            action: current ? "skip" : "render",
            existing: current ? existing : null,
            // Audio this item replaces; kept if the render is deferred or fails.
            previous: current ? null : (existing ?? null),
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
  // Summary only (the app reads each entry's own voice): every voice in use, per language.
  const voices = { fil: new Set(), en: new Set() };
  for (const lesson of Object.values(sorted))
    for (const section of Object.values(lesson.sections))
      for (const [language, entry] of Object.entries(section)) voices[language]?.add(entry.voice);
  const summary = Object.fromEntries(Object.entries(voices).map(([l, set]) => [l, [...set].sort().join(", ")]));
  return { format: "mp3", voices: summary, lessons: sorted, ...(previous.history ? { history: previous.history } : {}) };
}

export function referencedSources(manifest) {
  const sources = new Set();
  for (const lesson of [...Object.values(manifest.lessons ?? {}), ...Object.values(manifest.history ?? {}).flat()])
    for (const section of Object.values(lesson.sections))
      for (const entry of Object.values(section)) sources.add(entry.src);
  return sources;
}

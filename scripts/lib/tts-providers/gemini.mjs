// Gemini TTS provider (opt-in via `training:tts -- --provider gemini`).
//
// Gemini returns audio but no sentence timings, and the read-along and
// INC-28 scene build-up both need exact per-zone start/end times. So each
// zone (heading, body sentence, takeaway) is synthesized as its own
// request and the clips are joined with a short pause: the timings then
// come from the measured length of each clip, not from an estimate.
//
// Output is 24 kHz 16-bit mono PCM, re-encoded here to MP3 so a section
// costs ~6 KB/s on a BHW's mobile data instead of ~48 KB/s.
//
// fetch and sleep are injected so the request/retry/assembly logic is
// testable without a network call (gemini.test.mjs).

import { Mp3Encoder } from "@breezystack/lamejs";

export const GEMINI_TTS_MODEL = "gemini-3.8-flash-tts";
export const GEMINI_VOICE = "Kore";
// Direct call, outside callProvider(): this build-time script only ever
// sends published lesson text from content/training/ (admin_authored, Tier B
// permitted per docs/free-ai-leverage-plan.md), never user or personal data.
// eslint-disable-next-line no-restricted-syntax
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_SAMPLE_RATE = 24000;
const GAP_MS = 300;
const MP3_KBPS = 48;
const MAX_ATTEMPTS = 6;

const STYLES = {
  fil: "Speak in Filipino (Tagalog) in a warm, clear voice at a steady teaching pace, like a community health trainer.",
  en: "Speak in clear, warm English at a steady teaching pace, like a community health trainer.",
};

// The voice string recorded in content_hash for Gemini renders, so switching
// provider re-renders a section instead of skipping it as unchanged.
export function geminiVoiceId(model = GEMINI_TTS_MODEL, voice = GEMINI_VOICE) {
  return `gemini:${model}:${voice}`;
}

function findAudioData(node) {
  if (!node || typeof node !== "object") return null;
  if (typeof node.data === "string" && node.data.length > 0) return node.data;
  for (const value of Object.values(node)) {
    const found = findAudioData(value);
    if (found) return found;
  }
  return null;
}

// Accepts either a WAV file or headerless PCM (the API's unary default is
// WAV; streaming returns raw L16), returning 16-bit samples + sample rate.
export function decodePcm(bytes) {
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WAVE") {
    let offset = 12;
    let sampleRate = DEFAULT_SAMPLE_RATE;
    while (offset + 8 <= bytes.length) {
      const id = bytes.toString("ascii", offset, offset + 4);
      const size = bytes.readUInt32LE(offset + 4);
      const body = offset + 8;
      if (id === "fmt ") {
        const channels = bytes.readUInt16LE(body + 2);
        const bits = bytes.readUInt16LE(body + 14);
        if (channels !== 1 || bits !== 16) throw new Error(`gemini: expected 16-bit mono WAV, got ${bits}-bit ${channels}ch`);
        sampleRate = bytes.readUInt32LE(body + 4);
      } else if (id === "data") {
        const end = Math.min(body + size, bytes.length);
        return { samples: toInt16(bytes.subarray(body, end)), sampleRate };
      }
      offset = body + size + (size % 2);
    }
    throw new Error("gemini: WAV response has no data chunk");
  }
  return { samples: toInt16(bytes), sampleRate: DEFAULT_SAMPLE_RATE };
}

function toInt16(buf) {
  const even = buf.subarray(0, buf.length - (buf.length % 2));
  const copy = Buffer.from(even);
  return new Int16Array(copy.buffer, copy.byteOffset, copy.length / 2);
}

function encodeMp3(samples, sampleRate) {
  const encoder = new Mp3Encoder(1, sampleRate, MP3_KBPS);
  const chunks = [];
  const block = 1152;
  for (let i = 0; i < samples.length; i += block) {
    const out = encoder.encodeBuffer(samples.subarray(i, i + block));
    if (out.length) chunks.push(Buffer.from(out));
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  return Buffer.concat(chunks);
}

async function synthesizeZoneText(text, language, { apiKey, model, voice, fetchImpl, sleep }) {
  const body = {
    model,
    input: [
      {
        type: "user_input",
        content: [
          {
            type: "text",
            text,
            annotations: [{ type: "speech_metadata", style: STYLES[language] ?? STYLES.en }],
          },
        ],
      },
    ],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice }] },
  };

  for (let attempt = 1; ; attempt += 1) {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = findAudioData(await response.json());
      if (!data) throw new Error("gemini: response contained no audio data");
      return decodePcm(Buffer.from(data, "base64"));
    }

    const retryable = response.status === 429 || response.status >= 500;
    const detail = await response.text().catch(() => "");
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      throw new Error(`gemini: HTTP ${response.status} after ${attempt} attempt(s): ${detail.slice(0, 300)}`);
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(60_000, 2000 * 2 ** (attempt - 1));
    await sleep(waitMs);
  }
}

export async function synthesizeWithGemini(zones, language, options) {
  const {
    apiKey,
    model = GEMINI_TTS_MODEL,
    voice = GEMINI_VOICE,
    fetchImpl = fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;
  if (!apiKey) throw new Error("gemini: GEMINI_API_KEY is not set");

  const clips = [];
  for (const zone of zones) {
    clips.push(await synthesizeZoneText(zone.text, language, { apiKey, model, voice, fetchImpl, sleep }));
  }

  const sampleRate = clips[0]?.sampleRate ?? DEFAULT_SAMPLE_RATE;
  if (clips.some((clip) => clip.sampleRate !== sampleRate)) {
    throw new Error("gemini: clips came back at different sample rates");
  }
  const gapSamples = Math.round((sampleRate * GAP_MS) / 1000);
  const total = clips.reduce((sum, clip) => sum + clip.samples.length, 0) + gapSamples * Math.max(0, clips.length - 1);
  const joined = new Int16Array(total);

  const timings = [];
  let cursor = 0;
  clips.forEach((clip, i) => {
    joined.set(clip.samples, cursor);
    const start = cursor;
    cursor += clip.samples.length;
    timings.push({
      zone: zones[i].zone,
      index: zones[i].index,
      text: zones[i].text,
      start_ms: Math.round((start / sampleRate) * 1000),
      end_ms: Math.round((cursor / sampleRate) * 1000),
    });
    if (i < clips.length - 1) cursor += gapSamples;
  });

  return {
    provider: "gemini",
    audioBytes: encodeMp3(joined, sampleRate),
    format: "mp3",
    durationSeconds: total / sampleRate,
    timings,
    charCount: zones.reduce((sum, zone) => sum + zone.text.length, 0),
  };
}

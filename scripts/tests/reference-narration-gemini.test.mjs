// @vitest-environment node
// training:narrate --provider gemini: planning, rendering and the manifest.
// Gemini is reached through a fake fetch, as in tts-providers/gemini.test.mjs.
import { expect, test, vi } from "vitest";
import {
  buildManifest,
  mp3AudioFrames,
  NARRATION_VOICES,
  planReferenceNarration,
  renderNarration,
} from "../lib/reference-narration.mjs";
import { geminiVoiceId, synthesizeWithGemini } from "../lib/tts-providers/gemini.mjs";

const lesson = {
  manifest: { lesson_key: "bhw-roles-hepo" },
  revision: {
    read_sections: [
      {
        id: "hepo",
        heading_fil: "Ang BHW bilang HEPO",
        heading_en: "The BHW as HEPO",
        body_fil: "Ang **BHW** ay tumutulong sa CHO/MHO. Ikalawang pangungusap.",
        body_en: "One.",
        takeaway_fil: "Tandaan.",
        takeaway_en: "Remember.",
      },
    ],
  },
};
const modules = [{ key: "01-tungkulin-ng-bhw", lessons: [lesson] }];

function pcmResponse(seconds) {
  const pcm = Buffer.alloc(Math.round(24000 * seconds) * 2);
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ steps: [{ content: [{ type: "audio", data: pcm.toString("base64") }] }] }),
  };
}

test("--provider gemini plans every section with the Gemini voice and a different file name", () => {
  const edge = planReferenceNarration(modules, { lessons: {} }, () => null);
  const gemini = planReferenceNarration(modules, { lessons: {} }, () => null, { provider: "gemini" });
  expect(edge.map((i) => [i.provider, i.voice])).toEqual([
    ["edge", NARRATION_VOICES.fil],
    ["edge", NARRATION_VOICES.en],
  ]);
  expect(gemini.every((i) => i.provider === "gemini" && i.voice === geminiVoiceId())).toBe(true);
  gemini.forEach((item, i) => {
    expect(item.contentHash).not.toBe(edge[i].contentHash);
    expect(item.src).not.toBe(edge[i].src);
  });
});

test("without --provider a section keeps its current provider, and switching re-renders it", () => {
  const planned = planReferenceNarration(modules, { lessons: {} }, () => null, { provider: "gemini" });
  const results = planned.map((i) => ({ ...i, sha256: `sha-${i.language}`, durationSeconds: 1, timings: [] }));
  const manifest = buildManifest({ lessons: {} }, modules, results);
  const hashes = (src) => (src.includes(".fil.") ? "sha-fil" : "sha-en");

  const again = planReferenceNarration(modules, manifest, hashes);
  expect(again.map((i) => [i.provider, i.action])).toEqual([
    ["gemini", "skip"],
    ["gemini", "skip"],
  ]);
  const back = planReferenceNarration(modules, manifest, hashes, { provider: "edge" });
  expect(back.every((i) => i.action === "render" && i.previous?.voice === geminiVoiceId())).toBe(true);
  expect(manifest.voices).toEqual({ fil: geminiVoiceId(), en: geminiVoiceId() });
});

test("Gemini hears the spoken text; timings keep the displayed text; audio is 32 kbps", async () => {
  const [item] = planReferenceNarration(modules, { lessons: {} }, () => null, { provider: "gemini" });
  const fetchImpl = vi.fn(async () => pcmResponse(0.5));
  const audio = await renderNarration(item, { synthesizeWithGemini, geminiApiKey: "k", fetchImpl });

  const sent = fetchImpl.mock.calls.map(([, init]) => JSON.parse(init.body).input[0].content[0].text);
  expect(sent).toEqual([
    "Ang bi-eych-dobolyu bilang eych-i-pi-o",
    "Ang bi-eych-dobolyu ay tumutulong sa si-eych-o o em-eych-o.",
    "Ikalawang pangungusap.",
    "Tandaan.",
  ]);
  // Exactly the zones the page rebuilds from the revision (timingsMatchSection).
  expect(audio.timings.map(({ zone, index, text }) => ({ zone, index, text }))).toEqual(item.zones);
  expect(audio.timings[1]).toMatchObject({ start_ms: 800, end_ms: 1300 });

  const frames = mp3AudioFrames(audio.bytes);
  // MPEG-2 Layer III bitrate index 4 = 32 kbps; LAME resamples 24 kHz to 22.05 kHz at this rate.
  expect(new Set(frames.map((f) => `${f.sampleRate}/${(f.data[2] >> 4) & 0xf}`))).toEqual(new Set(["22050/4"]));
  const seconds = frames.reduce((n, f) => n + f.samples, 0) / 22050;
  expect(audio.durationSeconds).toBeCloseTo(seconds, 3);
  expect(audio.timings.at(-1).end_ms).toBeLessThanOrEqual(Math.round(seconds * 1000));
});

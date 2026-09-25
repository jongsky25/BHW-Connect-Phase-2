import { describe, expect, it, vi } from "vitest";
import { decodePcm, geminiVoiceId, synthesizeWithGemini } from "./gemini.mjs";

function wav(seconds, sampleRate = 24000) {
  const dataSize = Math.round(sampleRate * seconds) * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVEfmt ", 8, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

function audioResponse(bytes) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ steps: [{ content: [{ type: "audio", mime_type: "audio/wav", data: bytes.toString("base64") }] }] }),
  };
}

function errorResponse(status, headers = {}) {
  return { ok: false, status, headers: new Headers(headers), text: async () => "rate limited", json: async () => ({}) };
}

const zones = [
  { zone: "heading", index: 0, text: "Tungkulin" },
  { zone: "body", index: 0, text: "Unang pangungusap." },
];

describe("decodePcm", () => {
  it("reads sample rate and samples from a WAV", () => {
    const { samples, sampleRate } = decodePcm(wav(0.5, 16000));
    expect(sampleRate).toBe(16000);
    expect(samples.length).toBe(8000);
  });

  it("treats headerless bytes as 24 kHz 16-bit PCM", () => {
    const { samples, sampleRate } = decodePcm(Buffer.alloc(4800));
    expect(sampleRate).toBe(24000);
    expect(samples.length).toBe(2400);
  });
});

describe("synthesizeWithGemini", () => {
  it("renders one request per zone and derives timings from clip lengths plus a 300ms gap", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(audioResponse(wav(0.5)))
      .mockResolvedValueOnce(audioResponse(wav(1)));

    const result = await synthesizeWithGemini(zones, "fil", { apiKey: "k", fetchImpl, sleep: async () => {} });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("/v1beta/interactions");
    expect(init.headers["x-goog-api-key"]).toBe("k");
    const body = JSON.parse(init.body);
    expect(body.input[0].content[0].text).toBe("Tungkulin");
    expect(body.input[0].content[0].annotations[0].style).toMatch(/Filipino/);
    expect(body.generation_config.speech_config[0].voice).toBe("Kore");

    expect(result.timings).toEqual([
      { zone: "heading", index: 0, text: "Tungkulin", start_ms: 0, end_ms: 500 },
      { zone: "body", index: 0, text: "Unang pangungusap.", start_ms: 800, end_ms: 1800 },
    ]);
    expect(result.durationSeconds).toBeCloseTo(1.8, 5);
    expect(result).toMatchObject({ provider: "gemini", format: "mp3", charCount: 27 });
    expect(result.audioBytes.length).toBeGreaterThan(0);
    expect(result.audioBytes[0]).toBe(0xff);
  });

  it("waits and retries on 429, honoring Retry-After", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(429, { "retry-after": "3" }))
      .mockResolvedValueOnce(audioResponse(wav(0.2)));

    await synthesizeWithGemini([zones[0]], "en", { apiKey: "k", fetchImpl, sleep });

    expect(sleep).toHaveBeenCalledWith(3000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("fails immediately on a non-retryable error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(400));
    await expect(
      synthesizeWithGemini([zones[0]], "en", { apiKey: "k", fetchImpl, sleep: async () => {} }),
    ).rejects.toThrow(/HTTP 400 after 1 attempt/);
  });

  it("refuses to run without an API key", async () => {
    await expect(synthesizeWithGemini(zones, "fil", { apiKey: "" })).rejects.toThrow(/GEMINI_API_KEY/);
  });
});

describe("geminiVoiceId", () => {
  it("includes the model so switching provider or model re-renders sections", () => {
    expect(geminiVoiceId()).toBe("gemini:gemini-3.8-flash-tts:Kore");
  });
});

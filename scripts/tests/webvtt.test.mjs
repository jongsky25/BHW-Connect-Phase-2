// @vitest-environment node
import { test } from "vitest";
import assert from "node:assert/strict";
import { toWebVtt } from "../lib/webvtt.mjs";

test("one cue per beat, timed to the narration", () => {
  const vtt = toWebVtt({
    beats: [
      { zone: "intro", text: "Handrub: eight steps.", start_ms: 0, end_ms: 9880 },
      { zone: "closing", text: "Only  20–30 seconds\nin real life.", start_ms: 3_725_004, end_ms: 3_726_500 },
    ],
  });
  assert.equal(
    vtt,
    "WEBVTT\n\n1\n00:00:00.000 --> 00:00:09.880\nHandrub: eight steps.\n\n" +
      "2\n01:02:05.004 --> 01:02:06.500\nOnly 20–30 seconds in real life.\n",
  );
});

test("rejects a beat with no text or no duration", () => {
  assert.throws(() => toWebVtt({ beats: [{ zone: "a", text: " ", start_ms: 0, end_ms: 5 }] }), /no text/);
  assert.throws(() => toWebVtt({ beats: [{ zone: "a", text: "x", start_ms: 5, end_ms: 5 }] }), /no duration/);
});

test("the committed narration timings produce valid captions", async () => {
  const { readFileSync } = await import("node:fs");
  for (const lang of ["fil", "en"]) {
    const timings = JSON.parse(
      readFileSync(new URL(`../../remotion/public/hand-hygiene/narration-${lang}.json`, import.meta.url), "utf8"),
    );
    const vtt = toWebVtt(timings);
    assert.equal(vtt.match(/ --> /g).length, timings.beats.length);
  }
});

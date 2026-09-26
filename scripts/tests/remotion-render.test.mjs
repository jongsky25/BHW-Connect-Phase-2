// @vitest-environment node
import { test } from "vitest";
import assert from "node:assert/strict";
import { parseArgs, parseDuration } from "../remotion-render.mjs";

test("positional composition and output name, optional --public", () => {
  assert.deepEqual(parseArgs(["HandrubSteps"]), {
    compositionId: "HandrubSteps",
    outputName: "HandrubSteps",
    publicDir: undefined,
    withAudio: false,
    captions: undefined,
  });
  assert.deepEqual(
    parseArgs(["HandrubSteps", "handrub-steps", "--public", "training/chapter2-draft"]),
    { compositionId: "HandrubSteps", outputName: "handrub-steps", publicDir: "training/chapter2-draft", withAudio: false, captions: undefined },
  );
  assert.equal(parseArgs(["X", "--public=training/x"]).publicDir, "training/x");
  assert.equal(parseArgs(["X", "--with-audio"]).withAudio, true);
  assert.equal(parseArgs(["X", "--captions", "hand-hygiene/narration-fil.json"]).captions, "hand-hygiene/narration-fil.json");
});

test("rejects a missing composition and a --public outside public/", () => {
  assert.throws(() => parseArgs([]), /usage/);
  assert.throws(() => parseArgs(["X", "--public", "../src"]), /under public/);
  assert.throws(() => parseArgs(["X", "--public", ""]), /usage/);
  assert.throws(() => parseArgs(["X", "--captions", "../../etc/x.json"]), /remotion\/public/);
  assert.throws(() => parseArgs(["X", "--captions", "hand-hygiene/narration-fil.mp3"]), /timings \.json/);
});

test("reads the duration from `remotion compositions` output", () => {
  const listing = `\nThe following compositions are available:\n\nOther           24      1280x720       48 (2.00 sec)\nHandrubSteps    30      854x480        810 (27.00 sec)\n`;
  assert.equal(parseDuration(listing, "HandrubSteps"), 27);
  assert.throws(() => parseDuration(listing, "Missing"), /not found/);
});

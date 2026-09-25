// @vitest-environment node
import { test } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NARRATION_MANIFEST, narratedModules } from "../lib/narration-sources.mjs";
import { loadReferenceModule } from "../lib/reference-content.mjs";
import {
  assembleNarration,
  buildManifest,
  mp3AudioFrames,
  planReferenceNarration,
  referencedSources,
  sha256,
  spokenText,
} from "../lib/reference-narration.mjs";
import { audioPayload, buildUtteranceSsml, secMsGec } from "../lib/tts-providers/edge-read-aloud.mjs";

// MPEG-2 Layer III, 48 kbps, 24 kHz, mono: 144-byte frames of 576 samples (24 ms).
function frame(fill = 0) {
  const bytes = Buffer.alloc(144, fill);
  bytes.set([0xff, 0xf3, 0x64, 0xc4]);
  return bytes;
}
function infoFrame() {
  const bytes = frame();
  bytes.write("Info", 13, "latin1");
  return bytes;
}
const clip = (frames, fill) => Buffer.concat([infoFrame(), ...Array.from({ length: frames }, () => frame(fill))]);

test("MP3 clips lose their Info header frame and keep every audio frame", () => {
  const frames = mp3AudioFrames(clip(10, 1));
  assert.equal(frames.length, 10);
  assert.ok(frames.every((f) => f.length === 144 && f.samples === 576 && f.sampleRate === 24000));
  assert.throws(() => mp3AudioFrames(Buffer.concat([frame(), Buffer.from("junk")])), /unparseable/);
});

test("assembled narration timings are exact frame arithmetic in zone order", () => {
  const zones = [
    { zone: "heading", index: 0, text: "Pamagat" },
    { zone: "body", index: 0, text: "Una." },
    { zone: "takeaway", index: 0, text: "Tandaan." },
  ];
  const audio = assembleNarration(zones, [clip(10, 1), clip(5, 2), clip(20, 3)]);
  assert.equal(audio.bytes.length, 35 * 144);
  assert.deepEqual(
    audio.timings.map((t) => [t.zone, t.start_ms, t.end_ms]),
    [
      ["heading", 0, 240],
      ["body", 240, 360],
      ["takeaway", 360, 840],
    ],
  );
  assert.equal(audio.durationSeconds, 0.84);
  assert.equal(mp3AudioFrames(audio.bytes).length, 35, "no Info frame survives inside the joined file");
  assert.throws(() => assembleNarration(zones, [clip(1)]), /one clip/);
});

test("speech drops emphasis markers; SSML escapes text", () => {
  assert.equal(spokenText("**Mali**: Hindi  tama.", "fil"), "Mali: Hindi tama.");
  assert.match(buildUtteranceSsml(`A & B <"x">`, "en-PH-RosaNeural"), /xml:lang='en-PH'.*A &amp; B &lt;&quot;x&quot;&gt;/);
});

test("read-aloud token matches the reference implementation and rotates every 5 minutes", () => {
  // Reference value from edge-tts's DRM.generate_sec_ms_gec for this timestamp.
  assert.equal(secMsGec(1_790_000_000_123), "CA99F0B37F2EAC6F5D719AE4BA7C98978842B3F335D9F42979070A8DB149F0A5");
  assert.equal(secMsGec(1_790_000_000_000), secMsGec(1_790_000_099_000));
  assert.notEqual(secMsGec(1_790_000_000_000), secMsGec(1_790_000_400_000));
  const header = "X-RequestId:1\r\nPath:audio";
  const framed = Buffer.concat([Buffer.from([0, header.length]), Buffer.from(header), Buffer.from([7, 8])]);
  assert.deepEqual([...audioPayload(framed)], [7, 8]);
});

test("all-caps acronyms are spoken letter by letter in both languages", () => {
  assert.equal(spokenText("Ang **BHW** ay kasama ng RHU sa UHC.", "fil"), "Ang bi-eych-dobolyu ay kasama ng ar-eych-yu sa yu-eych-si.");
  assert.equal(spokenText("The BHW works with the RHU under UHC.", "en"), "The B H W works with the R H U under U H C.");
  assert.equal(spokenText("HEPO, SMART at LIPH", "fil"), "eych-i-pi-o, es-em-ey-ar-ti at el-ay-pi-eych");
  assert.equal(spokenText("Many BHWs; the BHW’s duty; BHWs' skill; HEPOs.", "en"), "Many B H W's; the B H W's duty; B H W's skill; H E P O's.");
  assert.equal(spokenText("Maraming BHWs.", "fil"), "Maraming bi-eych-dobolyus.");
  assert.equal(spokenText("RA 7883 IRR at HH-014", "fil"), "ar-ey 7883 ay-ar-ar at eych-eych-014");
  assert.equal(spokenText("the CHO/MHO and midwife/RHU", "en"), "the C H O or M H O and midwife or R H U");
  assert.equal(spokenText("ang CHO/MHO", "fil"), "ang si-eych-o o em-eych-o");
  assert.equal(spokenText("Chapters II at III", "fil"), "Chapters 2 at 3", "Roman numerals are numbers, not acronyms");
  assert.equal(spokenText("PhilHealth, Barangay, A at I", "en"), "PhilHealth, Barangay, A at I", "single capitals and mixed case are untouched");
});

const lesson = (body) => ({
  manifest: { lesson_key: "sample" },
  revision: {
    read_sections: [
      { id: "section-1", heading_fil: "Pamagat", heading_en: "Title", body_fil: body, body_en: "One.", takeaway_fil: "Aral.", takeaway_en: "Lesson." },
    ],
  },
});

test("plan renders new or edited sections and skips unchanged ones", () => {
  const modules = [{ key: "02-uhc-act", lessons: [lesson("Una.")] }];
  const first = planReferenceNarration(modules, { lessons: {} }, () => null);
  assert.deepEqual(first.map((i) => [i.language, i.action]), [["fil", "render"], ["en", "render"]]);
  assert.match(first[0].src, /^\/training\/audio\/02-uhc-act\/sample\/section-1\.fil\.[0-9a-f]{12}\.mp3$/);

  const results = first.map((i) => ({ ...i, sha256: `sha-${i.language}`, durationSeconds: 1, timings: [] }));
  const manifest = buildManifest({ lessons: { other: { module: "01-tungkulin-ng-bhw", sections: {} } } }, modules, results);
  assert.deepEqual(Object.keys(manifest.lessons), ["other", "sample"], "other subchapters are left untouched");
  const hashes = (src) => (src.includes(".fil.") ? "sha-fil" : "sha-en");
  assert.ok(planReferenceNarration(modules, manifest, hashes).every((i) => i.action === "skip"));

  const edited = planReferenceNarration([{ key: "02-uhc-act", lessons: [lesson("Binago.")] }], manifest, hashes);
  assert.deepEqual(edited.map((i) => i.action), ["render", "skip"]);
  assert.ok(planReferenceNarration(modules, manifest, () => "tampered").every((i) => i.action === "render"));
});

// Guard for the committed narration: every converted subchapter's Read
// sections have current audio in both languages, and every file matches its
// manifest hash. Editing lesson text without `npm run training:narrate --
// --apply` fails here instead of silently hiding the player for learners.
test("committed narration is current for every converted subchapter", () => {
  const manifest = JSON.parse(readFileSync(NARRATION_MANIFEST, "utf8"));
  const modules = narratedModules(".").map(({ key, dir }) => ({ key, lessons: loadReferenceModule(dir, "public").lessons }));
  // The page looks narration up by lesson key alone, across chapters.
  const lessonKeys = modules.flatMap((m) => m.lessons.map((l) => l.manifest.lesson_key));
  assert.equal(new Set(lessonKeys).size, lessonKeys.length, "lesson keys must be unique across narrated chapters");
  const file = (src) => path.join("public", src.slice(1));
  const items = planReferenceNarration(modules, manifest, (src) => (existsSync(file(src)) ? sha256(readFileSync(file(src))) : null));
  const stale = items.filter((i) => i.action !== "skip").map((i) => `${i.lessonKey}/${i.sectionId}/${i.language}`);
  assert.deepEqual(stale, [], "run `npm run training:narrate -- --apply`");
  assert.equal(referencedSources(manifest).size, items.length, "no manifest entries beyond the converted lessons");
  for (const item of items) {
    const frames = mp3AudioFrames(readFileSync(file(item.src)));
    const seconds = frames.reduce((n, f) => n + f.samples / f.sampleRate, 0);
    assert.ok(Math.abs(seconds - item.existing.duration_seconds) < 0.01, `${item.src} duration`);
    const fileMs = Math.round(seconds * 1000);
    const lastEnd = item.existing.timings.at(-1).end_ms;
    if (item.provider === "gemini") {
      // One encode of the whole section: LAME pads the final frames, so the
      // file runs slightly past the last sentence.
      assert.ok(lastEnd <= fileMs && fileMs - lastEnd < 150, `${item.src} last sentence ends at ${lastEnd} of ${fileMs} ms`);
    } else assert.equal(lastEnd, fileMs);
  }
});

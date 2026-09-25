#!/usr/bin/env node
// INC-28 tier 2 (docs/training-modules-plan.md): renders a composition from
// the remotion/ sub-project to the format the plan commits to — 480p H.264,
// muted (narration is a separate audio track per LessonNarration, exactly
// as tier 1's SVG scenes already work), plus a poster frame for the
// lazy-loaded <video> tag. A thin wrapper around the Remotion CLI, not a
// content pipeline: no module/DB wiring exists yet because no authored
// module has a concept that meets the tier's own bar ("the few concepts
// that genuinely need video" — Five Whys, sharps disposal). Run this once
// INC-24/25 authors a module with one; until then it is a verified-working
// pipeline with nothing queued through it.
//
//   npm run remotion:render -- <composition-id> [output-name]
//
// Writes <output-name>.mp4 and <output-name>-poster.jpg under remotion/out/.

import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";

const REMOTION_DIR = path.resolve(import.meta.dirname, "..", "remotion");
const OUT_DIR = path.join(REMOTION_DIR, "out");

// The plan's own budget: ~0.5-1 MB for a 20s clip. Anything past 1.5 MB for
// a clip that short means the CRF/bitrate settings below need revisiting
// before this ships in a lesson, not a blocker for this script itself.
const SIZE_WARNING_BYTES_PER_SECOND = 75_000;

function parseArgs(argv) {
  const [compositionId, outputName] = argv;
  if (!compositionId) {
    throw new Error("usage: remotion:render -- <composition-id> [output-name]");
  }
  return { compositionId, outputName: outputName ?? compositionId };
}

function run(cmd, args) {
  console.log(`  $ npx ${cmd} ${args.join(" ")}`);
  execFileSync("npx", [cmd, ...args], { cwd: REMOTION_DIR, stdio: "inherit" });
}

function main() {
  const { compositionId, outputName } = parseArgs(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });

  const videoPath = path.join(OUT_DIR, `${outputName}.mp4`);
  const posterPath = path.join(OUT_DIR, `${outputName}-poster.jpg`);

  run("remotion", [
    "render",
    compositionId,
    videoPath,
    "--codec=h264",
    "--height=480",
    "--width=854",
    "--crf=28",
    "--x264-preset=slow",
    "--muted",
    "--overwrite",
  ]);

  run("remotion", [
    "still",
    compositionId,
    posterPath,
    "--height=480",
    "--width=854",
    "--frame=0",
    "--overwrite",
  ]);

  const { size } = statSync(videoPath);
  console.log("");
  console.log(`video   ${videoPath} (${(size / 1024).toFixed(0)} KB)`);
  console.log(`poster  ${posterPath}`);

  // Duration isn't known here without re-reading the composition's own
  // metadata, so this only warns using the budget as a flat per-file
  // ceiling for a ~20s clip — a real size regression check belongs next to
  // whatever CI job eventually renders real content, not this script.
  const budget = SIZE_WARNING_BYTES_PER_SECOND * 20;
  if (size > budget) {
    console.warn(`  warn   ${(size / 1024).toFixed(0)} KB exceeds the ~${(budget / 1024).toFixed(0)} KB/20s budget in docs/training-modules-plan.md's INC-28 section`);
  }
}

main();

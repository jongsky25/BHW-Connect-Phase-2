#!/usr/bin/env node
// INC-28 tier 2 (docs/training-modules-plan.md): renders a composition from
// the remotion/ sub-project to the format the plan commits to — 480p H.264,
// muted by default (narration is a separate audio track per LessonNarration,
// exactly as tier 1's SVG scenes already work), plus a poster frame for the
// lazy-loaded <video> tag. The poster is the composition's LAST frame:
// clips end on a static summary of everything they teach, so the poster is
// also the reduced-motion / not-yet-played view. A composition that narrates
// itself (the clip carries its own <Audio>, per
// docs/handrub-clip-enhancement-handoff.md §3) uses --with-audio instead.
//
//   npm run remotion:render -- <composition-id> [output-name] [--public <dir>] [--with-audio]
//
// Writes <output-name>.mp4 and <output-name>-poster.jpg under remotion/out/.
// With --public (a directory under public/, e.g. training/chapter2-draft),
// also copies both there under content-hashed names, the reference lesson
// loader's convention, and prints the `video` fields for the lesson asset.
//
// --with-audio drops --muted and muxes the composition's own <Audio> tracks
// as AAC mono at 48 kbps (docs/handrub-clip-enhancement-handoff.md §3) —
// use it for a composition that carries its own narration, e.g. the handrub
// clip's per-language compositions (HandrubStepsFil, HandrubStepsEn).
//
// Set REMOTION_BROWSER_EXECUTABLE to render with an existing Chromium (e.g.
// Playwright's headless shell) instead of letting Remotion download one.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const REMOTION_DIR = path.join(ROOT, "remotion");
const OUT_DIR = path.join(REMOTION_DIR, "out");
const PUBLIC_DIR = path.join(ROOT, "public");

// The plan's own budget: ~0.5-1 MB for a 20s clip, i.e. ~50 KB/s. Past
// 75 KB/s the CRF/bitrate settings below need revisiting before the clip
// ships in a lesson.
const SIZE_WARNING_BYTES_PER_SECOND = 75_000;

export function parseArgs(argv) {
  const positional = [];
  let publicDir;
  let withAudio = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--public") publicDir = argv[++i];
    else if (argv[i].startsWith("--public=")) publicDir = argv[i].slice(9);
    else if (argv[i] === "--with-audio") withAudio = true;
    else positional.push(argv[i]);
  }
  const [compositionId, outputName] = positional;
  if (!compositionId || publicDir === "") {
    throw new Error(
      "usage: remotion:render -- <composition-id> [output-name] [--public <dir under public/>] [--with-audio]",
    );
  }
  if (publicDir !== undefined) {
    const resolved = path.resolve(PUBLIC_DIR, publicDir);
    if (!resolved.startsWith(PUBLIC_DIR + path.sep))
      throw new Error("--public must be a directory under public/");
  }
  return {
    compositionId,
    outputName: outputName ?? compositionId,
    publicDir,
    withAudio,
  };
}

function run(cmd, args) {
  const browser = process.env.REMOTION_BROWSER_EXECUTABLE;
  const all = browser ? [...args, `--browser-executable=${browser}`] : args;
  console.log(`  $ npx ${cmd} ${all.join(" ")}`);
  execFileSync("npx", [cmd, ...all], { cwd: REMOTION_DIR, stdio: "inherit" });
}

function publish(file, dir, name, ext) {
  const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
  const rel = path.posix.join(
    dir.split(path.sep).join("/"),
    `${name}-${hash.slice(0, 12)}${ext}`,
  );
  mkdirSync(path.join(PUBLIC_DIR, path.dirname(rel)), { recursive: true });
  copyFileSync(file, path.join(PUBLIC_DIR, rel));
  return { path: `/${rel}`, content_hash: hash };
}

function durationSeconds(compositionId) {
  const browser = process.env.REMOTION_BROWSER_EXECUTABLE;
  const out = execFileSync(
    "npx",
    [
      "remotion",
      "compositions",
      ...(browser ? [`--browser-executable=${browser}`] : []),
    ],
    {
      cwd: REMOTION_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  return parseDuration(out, compositionId);
}

// `remotion compositions` lists "<id>  <fps>  <w>x<h>  <frames> (<s> sec)".
export function parseDuration(listing, compositionId) {
  for (const line of listing.split("\n")) {
    const m = line.trim().match(/^(\S+)\s+(\d+)\s+\d+x\d+\s+(\d+)\b/);
    if (m && m[1] === compositionId) return Number(m[3]) / Number(m[2]);
  }
  throw new Error(
    `composition ${compositionId} not found in remotion compositions output`,
  );
}

function main() {
  const { compositionId, outputName, publicDir, withAudio } = parseArgs(
    process.argv.slice(2),
  );
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
    ...(withAudio
      ? ["--audio-codec=aac", "--audio-bitrate=48k"]
      : ["--muted"]),
    // BT.709 tags the stream limited-range yuv420p; the default leaves it
    // full-range yuvj420p, which some low-end Android/iOS decoders mishandle.
    "--color-space=bt709",
    "--overwrite",
  ]);

  run("remotion", [
    "still",
    compositionId,
    posterPath,
    "--height=480",
    "--width=854",
    "--frame=-1",
    "--image-format=jpeg",
    "--jpeg-quality=85",
    "--overwrite",
  ]);

  const { size } = statSync(videoPath);
  const seconds = durationSeconds(compositionId);
  console.log("");
  console.log(
    `video   ${videoPath} (${(size / 1024).toFixed(0)} KB, ${seconds.toFixed(1)} s)`,
  );
  console.log(`poster  ${posterPath}`);

  const budget = SIZE_WARNING_BYTES_PER_SECOND * seconds;
  if (size > budget) {
    console.warn(
      `  warn   ${(size / 1024).toFixed(0)} KB exceeds the ~${(budget / 1024).toFixed(0)} KB budget for ${seconds.toFixed(0)} s in docs/training-modules-plan.md's INC-28 section`,
    );
  }

  if (publicDir !== undefined) {
    const poster = publish(posterPath, publicDir, outputName, "-poster.jpg");
    const video = publish(videoPath, publicDir, outputName, ".mp4");
    console.log("");
    console.log("Lesson asset fields (lesson.json `assets[]`):");
    console.log(
      JSON.stringify(
        {
          path: poster.path,
          content_hash: poster.content_hash,
          video: { ...video, duration_s: Math.round(seconds) },
        },
        null,
        2,
      ),
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();

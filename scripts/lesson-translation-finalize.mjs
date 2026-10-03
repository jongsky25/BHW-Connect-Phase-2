// Attach the locally rendered, hashed media and export a portable review.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildCebuanoPilot, lessonDirectory } from "./lesson-translation-build.mjs";
import { mp3AudioFrames } from "./lib/reference-narration.mjs";

const root = path.resolve(import.meta.dirname, "..");
const hash = value => createHash("sha256").update(value).digest("hex");
const base = "roles-hepo-riza-gemini-ceb";
const out = path.join(root, "remotion/out");
const publicAsset = (suffix, extension) => {
  const bytes = readFileSync(path.join(out, base + suffix + extension));
  const digest = hash(bytes);
  const publicPath = `/training/bhw-1-1/${base}-${digest.slice(0, 12)}${suffix}${extension}`;
  if (!existsSync(path.join(root, "public", publicPath.slice(1)))) throw new Error(`Missing rendered public media: ${publicPath}`);
  return { path: publicPath, content_hash: digest };
};
const timings = JSON.parse(readFileSync(path.join(root, "remotion/public/roles-hepo/narration-ceb.json"), "utf8"));
const translated = JSON.parse(readFileSync(path.join(lessonDirectory, "translation.ceb.json"), "utf8"));
const mediaFile = path.join(lessonDirectory, "media.ceb.json");
const media = JSON.parse(readFileSync(mediaFile, "utf8"));
media.poster = publicAsset("-poster", ".jpg").path;
media.video = { ...publicAsset("", ".mp4"), duration_s: Math.round(timings.durationSeconds + 1.2), captions: publicAsset("", ".vtt") };
media.story_content_hash = hash(JSON.stringify(translated.story_beats));
writeFileSync(mediaFile, JSON.stringify(media, null, 2) + "\n");
const pilot = buildCebuanoPilot();
const fixtureFile = path.join(root, ".preview/lesson-111-cebuano/fixture.json");
if (existsSync(fixtureFile)) {
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  fixture.pilot = pilot;
  writeFileSync(fixtureFile, JSON.stringify(fixture));
}
const destination = process.argv[2];
if (!destination) throw new Error("Pass an output directory for the portable review");
mkdirSync(destination, { recursive: true });
const assetDirectory = path.join(destination, "lesson-1.1.1-bisaya-assets");
mkdirSync(assetDirectory, { recursive: true });
const escape = value => value.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const paragraphs = value => value.split(/\n\s*\n/).map(p => `<p>${escape(p)}</p>`).join("");
const check = value => value ? `<fieldset><legend>${escape(value.prompt)}</legend><ol>${value.options.map(option => `<li>${escape(option)}</li>`).join("")}</ol><details><summary>Tan-awa ang tubag ug pasabot</summary><p>${escape(value.feedback)}</p></details></fieldset>` : "";
const allFrames = [];
const reading = pilot.read_sections.map(section => {
  const entry = pilot.narration[section.id];
  const bytes = readFileSync(path.join(root, "public", entry.src.slice(1)));
  const audioName = `${section.id}.mp3`;
  writeFileSync(path.join(assetDirectory, audioName), bytes);
  allFrames.push(...mp3AudioFrames(bytes).map(frame => bytes.subarray(frame.offset, frame.offset + frame.length)));
  return `<article><h2>${escape(section.heading)}</h2><audio controls preload="none" src="lesson-1.1.1-bisaya-assets/${audioName}"></audio>${paragraphs(section.body)}${check(section.check)}<blockquote>${escape(section.takeaway)}</blockquote></article>`;
}).join("");
const slides = pilot.slides.map(slide => `<article><h2>${escape(slide.heading)}</h2><ul>${slide.display.split("\n").map(line => `<li>${escape(line)}</li>`).join("")}</ul>${check(slide.check)}</article>`).join("");
writeFileSync(path.join(destination, "lesson-1.1.1-bisaya-read.mp3"), Buffer.concat(allFrames));
copyFileSync(path.join(root, "public", pilot.video.path.slice(1)), path.join(destination, "lesson-1.1.1-bisaya.mp4"));
copyFileSync(path.join(root, "public", pilot.video.captions.path.slice(1)), path.join(destination, "lesson-1.1.1-bisaya.vtt"));
copyFileSync(path.join(root, "public", pilot.poster.slice(1)), path.join(destination, "lesson-1.1.1-bisaya-poster.jpg"));
const story = pilot.story_beats.map(beat => `<h3>${escape(beat.title)}</h3>${paragraphs(beat.text)}`).join("");
writeFileSync(path.join(destination, "lesson-1.1.1-bisaya.html"), `<!doctype html><html lang="ceb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>1.1.1 · Ang BHW ug ang HEPO</title><style>body{margin:0;background:#f7f5ee;color:#244039;font:18px/1.65 Arial,sans-serif}main{max-width:900px;margin:auto;padding:32px 20px}h1{line-height:1.2}h2{line-height:1.3;font-family:Georgia,serif}nav{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}button,summary{cursor:pointer}button{padding:12px 18px;border:1px solid #a8bcb0;border-radius:8px;font:inherit;background:#fff}button[aria-selected=true]{background:#244039;color:white}article{margin:20px 0;padding:24px;background:#fff;border:1px solid #d4ddd5;border-radius:12px}blockquote{border-left:4px solid #36885b;padding-left:16px;margin:20px 0}audio,video{max-width:100%;width:100%}fieldset{border:1px solid #b9cabb;border-radius:8px}li{margin:10px 0}.draft{padding:12px;border:1px solid #b9cabb;border-radius:8px;font-size:15px}</style></head><body><main><p>BHW CONNECT · 1.1.1 · BISAYA (CEBUANO)</p><h1>${escape(pilot.title)}</h1>${pilot.objectives.map(o=>`<p>${escape(o)}</p>`).join("")}<p class="draft">Draft alang sa pagsusi sa hubad ug paglitok. Gemini: ${escape(timings.model)} · ${escape(timings.voice)}.</p><nav role="tablist" aria-label="Matang sa sulod"><button role="tab" aria-controls="read" aria-selected="true" onclick="showTab('read',this)">Basaha</button><button role="tab" aria-controls="slides" aria-selected="false" onclick="showTab('slides',this)">Mga slide</button><button role="tab" aria-controls="story" aria-selected="false" onclick="showTab('story',this)">Sugilanong adunay salaysay</button></nav><section id="read" role="tabpanel">${reading}</section><section id="slides" role="tabpanel" hidden>${slides}</section><section id="story" role="tabpanel" hidden><video controls playsinline preload="none" poster="lesson-1.1.1-bisaya-poster.jpg" src="lesson-1.1.1-bisaya.mp4"><track kind="captions" src="lesson-1.1.1-bisaya.vtt" srclang="ceb" label="Bisaya (Cebuano)" default></video>${story}</section><p>Ang pagkahuman sa leksiyon dili pamatuod sa praktikal nga kahanas.</p></main><script>function showTab(id,button){document.querySelectorAll('[role=tabpanel]').forEach(p=>p.hidden=p.id!==id);document.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',b===button));document.querySelectorAll('audio,video').forEach(m=>m.pause());}</script></body></html>`);
console.log(JSON.stringify({ outputs: destination, video_seconds: pilot.video.duration_s,
  read_seconds: Object.values(pilot.narration).reduce((sum, value) => sum + value.duration_seconds, 0), review_status: pilot.review_status }));

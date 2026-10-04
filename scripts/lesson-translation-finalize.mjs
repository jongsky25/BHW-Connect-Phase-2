// Attach the locally rendered, hashed media and export a portable review.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildLessonPilot, lessonDirectory, lessonConfig, translationLanguage, pilotLanguages } from "./lesson-translation-build.mjs";
import { mp3AudioFrames } from "./lib/reference-narration.mjs";

const root = path.resolve(import.meta.dirname, "..");
const hash = value => createHash("sha256").update(value).digest("hex");
const language = translationLanguage();
const config = pilotLanguages[language];
const outputBase = `lesson-${lessonConfig.number}-${config.slug}`;
const base = `${lessonConfig.mediaBase}-${language}`;
const out = path.join(root, "remotion/out");
const publicAsset = (suffix, extension) => {
  const bytes = readFileSync(path.join(out, base + suffix + extension));
  const digest = hash(bytes);
  const publicPath = `/training/${lessonConfig.moduleKey}/${base}-${digest.slice(0, 12)}${suffix}${extension}`;
  if (!existsSync(path.join(root, "public", publicPath.slice(1)))) throw new Error(`Missing rendered public media: ${publicPath}`);
  return { path: publicPath, content_hash: digest };
};
const timings = JSON.parse(readFileSync(path.join(root, `remotion/public/${lessonConfig.story}/narration-${language}.json`), "utf8"));
const translated = JSON.parse(readFileSync(path.join(lessonDirectory, `translation.${language}.json`), "utf8"));
const mediaFile = path.join(lessonDirectory, `media.${language}.json`);
const media = JSON.parse(readFileSync(mediaFile, "utf8"));
media.poster = publicAsset("-poster", ".jpg").path;
media.video = { ...publicAsset("", ".mp4"), duration_s: Math.round(timings.durationSeconds + 1.2), captions: publicAsset("", ".vtt") };
media.story_content_hash = hash(JSON.stringify(translated.story_beats));
writeFileSync(mediaFile, JSON.stringify(media, null, 2) + "\n");
const pilot = buildLessonPilot(language);
const translations = Object.keys(pilotLanguages).map(code => code === language ? pilot : buildLessonPilot(code));
for (const [previewLanguage, previewConfig] of Object.entries(pilotLanguages)) {
  const fixtureFile = path.join(root, `.preview/lesson-${lessonConfig.number.replaceAll(".", "")}-${previewConfig.preview}/fixture.json`);
  if (existsSync(fixtureFile)) {
    const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
    fixture.pilot = translations.find(value => value.language === previewLanguage);
    fixture.translations = translations;
    writeFileSync(fixtureFile, JSON.stringify(fixture));
  }
}
const args = process.argv.slice(2);
const languageIndex = args.indexOf("--language");
if (languageIndex !== -1) args.splice(languageIndex, 2);
const lessonIndex = args.indexOf("--lesson");
if (lessonIndex !== -1) args.splice(lessonIndex, 2);
const [destination] = args;
if (!destination) throw new Error("Pass an output directory for the portable review");
mkdirSync(destination, { recursive: true });
const assetDirectory = path.join(destination, `${outputBase}-assets`);
mkdirSync(assetDirectory, { recursive: true });
const escape = value => value.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const ui = (key, fallback = key) => escape(pilot.ui[key] ?? fallback);
const paragraphs = value => value.split(/\n\s*\n/).map(p => `<p>${escape(p)}</p>`).join("");
const check = value => value ? `<fieldset><legend>${escape(value.prompt)}</legend><ol>${value.options.map(option => `<li>${escape(option)}</li>`).join("")}</ol><details><summary>${ui("Tan-awa ang tubag ug pasabot")}</summary><p>${escape(value.feedback)}</p></details></fieldset>` : "";
const allFrames = [];
const reading = pilot.read_sections.map(section => {
  const entry = pilot.narration[section.id];
  const bytes = readFileSync(path.join(root, "public", entry.src.slice(1)));
  const audioName = `${section.id}.mp3`;
  writeFileSync(path.join(assetDirectory, audioName), bytes);
  allFrames.push(...mp3AudioFrames(bytes).map(frame => bytes.subarray(frame.offset, frame.offset + frame.length)));
  return `<article><h2>${escape(section.heading)}</h2><audio controls preload="none" src="${outputBase}-assets/${audioName}"></audio>${paragraphs(section.body)}${check(section.check)}<blockquote>${escape(section.takeaway)}</blockquote></article>`;
}).join("");
const slides = pilot.slides.map(slide => `<article><h2>${escape(slide.heading)}</h2><ul>${slide.display.split("\n").map(line => `<li>${escape(line)}</li>`).join("")}</ul>${check(slide.check)}</article>`).join("");
writeFileSync(path.join(destination, `${outputBase}-read.mp3`), Buffer.concat(allFrames));
copyFileSync(path.join(root, "public", pilot.video.path.slice(1)), path.join(destination, `${outputBase}.mp4`));
copyFileSync(path.join(root, "public", pilot.video.captions.path.slice(1)), path.join(destination, `${outputBase}.vtt`));
copyFileSync(path.join(root, "public", pilot.poster.slice(1)), path.join(destination, `${outputBase}-poster.jpg`));
const captionText = JSON.stringify(readFileSync(path.join(root, "public", pilot.video.captions.path.slice(1)), "utf8")).replace(/</g, "\\u003c");
const story = pilot.story_beats.map(beat => `<h3>${escape(beat.title)}</h3>${paragraphs(beat.text)}`).join("");
writeFileSync(path.join(destination, `${outputBase}.html`), `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${lessonConfig.number} · ${escape(pilot.title)}</title><style>body{margin:0;background:#f7f5ee;color:#244039;font:18px/1.65 Arial,sans-serif}main{max-width:900px;margin:auto;padding:32px 20px}h1{line-height:1.2}h2{line-height:1.3;font-family:Georgia,serif}nav{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}button,summary{cursor:pointer}button{padding:12px 18px;border:1px solid #a8bcb0;border-radius:8px;font:inherit;background:#fff}button[aria-selected=true]{background:#244039;color:white}article{margin:20px 0;padding:24px;background:#fff;border:1px solid #d4ddd5;border-radius:12px}blockquote{border-left:4px solid #36885b;padding-left:16px;margin:20px 0}audio,video{max-width:100%;width:100%}fieldset{border:1px solid #b9cabb;border-radius:8px}li{margin:10px 0}.draft{padding:12px;border:1px solid #b9cabb;border-radius:8px;font-size:15px}</style></head><body><main><p>BHW CONNECT · ${lessonConfig.number} · ${escape(pilot.label.toUpperCase())}</p><h1>${escape(pilot.title)}</h1>${pilot.objectives.map(o=>`<p>${escape(o)}</p>`).join("")}<p class="draft">${pilot.review_status === "draft" ? ui("Draft para sa pagsusuri ng salin at pagbigkas.") : "Approved by the owner."} Gemini: ${escape(timings.model)} · ${escape(timings.voice)}.</p><nav role="tablist" aria-label="${ui("Uri ng nilalaman")}"><button role="tab" aria-controls="read" aria-selected="true" onclick="showTab('read',this)">${ui("Basahin")}</button><button role="tab" aria-controls="slides" aria-selected="false" onclick="showTab('slides',this)">${ui("Slides")}</button><button role="tab" aria-controls="story" aria-selected="false" onclick="showTab('story',this)">${ui("Kuwentong may salaysay")}</button></nav><section id="read" role="tabpanel">${reading}</section><section id="slides" role="tabpanel" hidden>${slides}</section><section id="story" role="tabpanel" hidden><video controls playsinline preload="none" poster="${outputBase}-poster.jpg" src="${outputBase}.mp4"><track kind="captions" srclang="${language}" label="${escape(pilot.label)}" default></video>${story}</section><p>${ui("Ang pagkumpleto ng aralin ay hindi katibayan ng praktikal na kakayahan.")}</p></main><script>const captionUrl=URL.createObjectURL(new Blob([${captionText}],{type:"text/vtt"}));document.querySelectorAll("track").forEach(track=>track.src=captionUrl);function showTab(id,button){document.querySelectorAll('[role=tabpanel]').forEach(p=>p.hidden=p.id!==id);document.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',b===button));document.querySelectorAll('audio,video').forEach(m=>m.pause());}</script></body></html>`);
console.log(JSON.stringify({ outputs: destination, video_seconds: pilot.video.duration_s,
  read_seconds: Object.values(pilot.narration).reduce((sum, value) => sum + value.duration_seconds, 0), review_status: pilot.review_status }));

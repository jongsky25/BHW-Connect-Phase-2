import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseReferenceRead } from "./lib/reference-content.mjs";
import { lessonTranslationSource } from "../src/lib/elearning/lesson-translation.ts";

const translatedLessons = {
  "1.1.1": { key: "bhw-roles-hepo", story: "roles-hepo", mediaBase: "roles-hepo-riza-gemini", port: 4311 },
  "1.1.2": { key: "bhw-health-educator", story: "health-educator", mediaBase: "health-educator-riza-gemini", port: 4313 },
  "1.1.3": { key: "bhw-community-organizer", story: "community-organizer", mediaBase: "community-organizer-riza-gemini", port: 4315 },
  "1.1.4": { key: "bhw-service-provider", story: "service-provider", mediaBase: "service-provider-riza-gemini", port: 4317 },
};
export function translationLesson(args = process.argv.slice(2)) {
  const index = args.indexOf("--lesson");
  const number = index === -1 ? "1.1.1" : args[index + 1];
  if (!Object.hasOwn(translatedLessons, number)) throw new Error("Use --lesson 1.1.1, --lesson 1.1.2, --lesson 1.1.3, or --lesson 1.1.4");
  return { number, ...translatedLessons[number] };
}
export const lessonConfig = translationLesson();
export const lessonDirectory = path.resolve(import.meta.dirname, `../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/${lessonConfig.key}`);
export const pilotLanguages = {
  ceb: { name: "Cebuano", slug: "bisaya", preview: "cebuano" },
  hil: { name: "Hiligaynon", slug: "hiligaynon", preview: "hiligaynon" },
};
export function translationLanguage(args = process.argv.slice(2)) {
  const index = args.indexOf("--language");
  const language = index === -1 ? "ceb" : args[index + 1];
  if (!Object.hasOwn(pilotLanguages, language)) throw new Error("Use --language ceb or --language hil");
  return language;
}
export function buildLessonPilot(language = "ceb") {
  if (!Object.hasOwn(pilotLanguages, language)) throw new Error("Unsupported lesson translation language");
  const name = pilotLanguages[language].name;
  const json = name => JSON.parse(readFileSync(path.join(lessonDirectory, name), "utf8"));
  const authored = json("lesson.json");
  const fil = parseReferenceRead(readFileSync(path.join(lessonDirectory, "read.fil.md"), "utf8"));
  const en = parseReferenceRead(readFileSync(path.join(lessonDirectory, "read.en.md"), "utf8"));
  const localizedRead = parseReferenceRead(readFileSync(path.join(lessonDirectory, `read.${language}.md`), "utf8"));
  const translated = json(`translation.${language}.json`);
  if (translated.language !== language) throw new Error("Translated language code does not match requested language");
  const source = { ...authored.manifest, revision: { read_sections: authored.sections.map((section, i) => ({ ...section,
    heading_fil: fil[i].heading, body_fil: fil[i].body, heading_en: en[i].heading, body_en: en[i].body })), slides: json("slides.json") } };
  const sameIds = (a, b) => JSON.stringify(a.map(s => s.id)) === JSON.stringify(b.map(s => s.id));
  if (!sameIds(localizedRead, source.revision.read_sections) || !sameIds(translated.read_sections, localizedRead) || !sameIds(translated.slides, source.revision.slides))
    throw new Error(`${name} section/slide IDs do not match lesson ${lessonConfig.number}`);
  if (translated.objectives.length !== source.objectives_fil.length) throw new Error("Missing translated objective");
  for (const [sourceItems, localizedItems] of [[source.revision.read_sections, translated.read_sections], [source.revision.slides, translated.slides]]) {
    sourceItems.forEach((s, i) => {
      const t = localizedItems[i];
      if (!!s.check !== !!t.check || (s.check && s.check.options.length !== t.check.options.length)) throw new Error(`Missing translated check: ${s.id}`);
      if (t.display?.length > 600) throw new Error(`Translated slide exceeds text budget: ${s.id}`);
    });
  }
  const pilot = { ...translated, source_text: lessonTranslationSource(source),
    read_sections: translated.read_sections.map((section, index) => ({ ...section, heading: localizedRead[index].heading, body: localizedRead[index].body })) };
  try {
    const media = json(`media.${language}.json`);
    const storyHash = createHash("sha256").update(JSON.stringify(pilot.story_beats)).digest("hex");
    if (media.story_content_hash !== storyHash) { delete media.video; delete media.poster; }
    Object.assign(pilot, media);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  writeFileSync(path.join(lessonDirectory, `pilot.${language}.json`), JSON.stringify(pilot, null, 2) + "\n");
  console.log(`${name} pilot built: ${pilot.read_sections.length} Read sections, ${pilot.slides.length} slides, ${pilot.story_beats.length} story beats`);
  return pilot;
}
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) buildLessonPilot(translationLanguage());

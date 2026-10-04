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
  "1.1.5": { key: "bhw-records", story: "records", mediaBase: "records-riza-gemini", port: 4319 },
  "1.1.6": { key: "bhw-roles-application", story: "roles-application", mediaBase: "roles-application-riza-gemini", port: 4321 },
  "1.2.1": { key: "uhc-coverage", story: "uhc-purpose", mediaBase: "uhc-purpose-vlanche-gemini", port: 4323, module: "02-uhc-act", moduleKey: "bhw-1-2", lessonCount: 4 },
  "1.2.2": { key: "uhc-primary-care", story: "uhc-primary-care", mediaBase: "primary-care-vlanche-gemini", port: 4325, module: "02-uhc-act", moduleKey: "bhw-1-2", lessonCount: 4 },
  "1.2.3": { key: "uhc-local-system", story: "uhc-local-system", mediaBase: "local-system-vlanche-gemini", port: 4327, module: "02-uhc-act", moduleKey: "bhw-1-2", lessonCount: 4 },
  "1.2.4": { key: "uhc-improvement", story: "uhc-improvement", mediaBase: "uhc-improvement-vlanche-gemini", port: 4329, module: "02-uhc-act", moduleKey: "bhw-1-2", lessonCount: 4 },
};
export function translationLesson(args = process.argv.slice(2)) {
  const index = args.indexOf("--lesson");
  const number = index === -1 ? "1.1.1" : args[index + 1];
  if (!Object.hasOwn(translatedLessons, number)) throw new Error(`Use --lesson ${Object.keys(translatedLessons).join(", ")}`);
  return { number, module: "01-tungkulin-ng-bhw", moduleKey: "bhw-1-1", lessonCount: 6, ...translatedLessons[number] };
}
export const lessonConfig = translationLesson();
export const lessonDirectory = path.resolve(import.meta.dirname, `../content/training/day1-basic-competencies/modules/${lessonConfig.module}/lessons/${lessonConfig.key}`);
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
  const sameSourceIds = items => JSON.stringify(items.map(s => s.id)) === JSON.stringify(authored.sections.map(s => s.id));
  if (!sameSourceIds(fil) || !sameSourceIds(en)) throw new Error("Bilingual Read IDs do not match authored sections");
  const localizedRead = parseReferenceRead(readFileSync(path.join(lessonDirectory, `read.${language}.md`), "utf8"));
  const translated = json(`translation.${language}.json`);
  if (translated.language !== language) throw new Error("Translated language code does not match requested language");
  if (translated.lesson_key !== lessonConfig.key) throw new Error("Translated lesson key does not match selected lesson");
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

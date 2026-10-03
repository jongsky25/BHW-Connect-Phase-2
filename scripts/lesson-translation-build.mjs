import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseReferenceRead } from "./lib/reference-content.mjs";
import { lessonTranslationSource } from "../src/lib/elearning/lesson-translation.ts";

export const lessonDirectory = path.resolve(import.meta.dirname, "../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-hepo");
export function buildCebuanoPilot() {
  const json = name => JSON.parse(readFileSync(path.join(lessonDirectory, name), "utf8"));
  const authored = json("lesson.json");
  const fil = parseReferenceRead(readFileSync(path.join(lessonDirectory, "read.fil.md"), "utf8"));
  const en = parseReferenceRead(readFileSync(path.join(lessonDirectory, "read.en.md"), "utf8"));
  const ceb = parseReferenceRead(readFileSync(path.join(lessonDirectory, "read.ceb.md"), "utf8"));
  const translated = json("translation.ceb.json");
  const source = { ...authored.manifest, revision: { read_sections: authored.sections.map((section, i) => ({ ...section,
    heading_fil: fil[i].heading, body_fil: fil[i].body, heading_en: en[i].heading, body_en: en[i].body })), slides: json("slides.json") } };
  const sameIds = (a, b) => JSON.stringify(a.map(s => s.id)) === JSON.stringify(b.map(s => s.id));
  if (!sameIds(ceb, source.revision.read_sections) || !sameIds(translated.read_sections, ceb) || !sameIds(translated.slides, source.revision.slides))
    throw new Error("Cebuano section/slide IDs do not match lesson 1.1.1");
  if (translated.objectives.length !== source.objectives_fil.length) throw new Error("Missing translated objective");
  for (const [sourceItems, localizedItems] of [[source.revision.read_sections, translated.read_sections], [source.revision.slides, translated.slides]]) {
    sourceItems.forEach((s, i) => {
      const t = localizedItems[i];
      if (!!s.check !== !!t.check || (s.check && s.check.options.length !== t.check.options.length)) throw new Error(`Missing translated check: ${s.id}`);
      if (t.display?.length > 600) throw new Error(`Translated slide exceeds text budget: ${s.id}`);
    });
  }
  const pilot = { ...translated, source_text: lessonTranslationSource(source),
    read_sections: translated.read_sections.map((section, index) => ({ ...section, heading: ceb[index].heading, body: ceb[index].body })) };
  try {
    const media = json("media.ceb.json");
    const storyHash = createHash("sha256").update(JSON.stringify(pilot.story_beats)).digest("hex");
    if (media.story_content_hash !== storyHash) { delete media.video; delete media.poster; }
    Object.assign(pilot, media);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  writeFileSync(path.join(lessonDirectory, "pilot.ceb.json"), JSON.stringify(pilot, null, 2) + "\n");
  console.log(`Cebuano pilot built: ${pilot.read_sections.length} Read sections, ${pilot.slides.length} slides, ${pilot.story_beats.length} story beats`);
  return pilot;
}
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) buildCebuanoPilot();

// Loopback-only review of the actual lesson component with authored content.
// No login adapter, database, progress writes, or public development route.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { parseReferenceRead } from "./lib/reference-content.mjs";
import { buildLessonPilot, lessonDirectory, translationLanguage, pilotLanguages } from "./lesson-translation-build.mjs";

const root = path.resolve(import.meta.dirname, "..");
const language = translationLanguage();
const config = pilotLanguages[language];
const previewName = `lesson-111-${config.preview}`;
const port = language === "hil" ? 4312 : 4311;
const directory = path.join(root, ".preview", previewName);
mkdirSync(directory, { recursive: true });
const json = name => JSON.parse(readFileSync(path.join(lessonDirectory, name), "utf8"));
const authored = json("lesson.json");
const reads = language => parseReferenceRead(readFileSync(path.join(lessonDirectory, `read.${language}.md`), "utf8"));
const fil = reads("fil"), en = reads("en");
const lesson = { ...authored.manifest, id: "lesson-111-preview", module_id: "module-11-preview", published_revision_id: "revision-111-preview",
  revision: { ...authored, id: "revision-111-preview", lesson_id: "lesson-111-preview", revision_key: "local-review", content_hash: "local-review",
    read_sections: authored.sections.map((section, index) => ({ ...section, heading_fil: fil[index].heading, body_fil: fil[index].body,
      heading_en: en[index].heading, body_en: en[index].body })), slides: json("slides.json") } };
const pilot = buildLessonPilot(language);
const translations = [buildLessonPilot("ceb"), buildLessonPilot("hil")];
writeFileSync(path.join(directory, "fixture.json"), JSON.stringify({ lesson, pilot, translations }));
writeFileSync(path.join(directory, "index.html"), `<!doctype html><html lang="fil"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BHW 1.1.1 · ${config.name} review</title></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>`);
writeFileSync(path.join(directory, "navigation.ts"), `export const useRouter=()=>({push:()=>{}});`);
writeFileSync(path.join(directory, "link.tsx"), `import React from 'react';export default function Link({prefetch,children,...props}:any){return <a {...props}>{children}</a>}`);
writeFileSync(path.join(directory, "image.tsx"), `import React from 'react';export default function Image({fill,priority,sizes,...props}:any){return <img {...props} style={fill?{position:'absolute',width:'100%',height:'100%',objectFit:'cover'}:undefined}/>}`);
writeFileSync(path.join(directory, "main.tsx"), `import React from 'react';import{createRoot}from'react-dom/client';import{ReferenceLessons}from'../../src/components/elearning/reference-lessons';import fixture from './fixture.json';import'../../src/app/globals.css';
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1000,margin:'0 auto',padding:'24px 16px',fontFamily:'Arial,sans-serif'}}><h1 className="text-2xl font-semibold">BHW Connect · Lesson 1.1.1</h1><p className="mb-5 text-sm">${config.name} translation and Gemini narration review</p><ReferenceLessons title_fil="Manual" title_en="Manual" chapters={[]} lessons={[fixture.lesson as any]} completed={[]} resumes={[]} modules={[]} locale="fil" initialLessonId={fixture.lesson.id} lessonBaseHref="#" readOnly translations={fixture.translations as any} lessonNumber={1} lessonCount={6} onResume={async()=>{}} onComplete={async()=>{}}/></main>);`);
const server = await createServer({ configFile: false, root, publicDir: path.join(root, "public"), plugins: [react()],
  resolve: { alias: { "@": path.join(root, "src"), "next/navigation": path.join(directory, "navigation.ts"), "next/link": path.join(directory, "link.tsx"), "next/image": path.join(directory, "image.tsx") } },
  server: { host: "127.0.0.1", port, strictPort: true } });
await server.listen();
console.log(`${config.name} lesson review: http://127.0.0.1:${port}/.preview/${previewName}/index.html`);

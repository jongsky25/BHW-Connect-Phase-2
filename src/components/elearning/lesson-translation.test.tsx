import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReferenceLessons } from "./reference-lessons";
import { lessonTranslationSource, translationMatchesLesson, type LessonTranslation } from "@/lib/elearning/lesson-translation";
import type { PublishedLesson } from "@/lib/elearning/reference-navigation";
import { buildNarrationZones } from "@/lib/elearning/narration-zones";
import { translationsForLesson } from "@/lib/elearning/lesson-translations";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
// A minimal image stub keeps the component test independent of Next image loading.
// eslint-disable-next-line @next/next/no-img-element
vi.mock("next/image", () => ({ default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt}/> }));
afterEach(cleanup);
const directory = path.resolve("content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-hepo");
const json = (name: string) => JSON.parse(readFileSync(path.join(directory, name), "utf8"));
const parseRead = (language: string) => readFileSync(path.join(directory, `read.${language}.md`), "utf8")
  .split(/^## \[([^\]]+)\] (.+)\r?\n/gm).slice(1).reduce<{ id: string; heading: string; body: string }[]>((out, part, index, parts) => {
    if (index % 3 === 0) out.push({ id: part, heading: parts[index + 1], body: parts[index + 2].trim() });
    return out;
  }, []);
function fixture() {
  const authored = json("lesson.json"), fil = parseRead("fil"), en = parseRead("en");
  const lesson = { ...authored.manifest, id: "lesson", module_id: "module", published_revision_id: "revision", created_at: "2026-10-03",
    revision: { id: "revision", lesson_id: "lesson", revision_key: "source", content_hash: "source", created_by: "author", created_at: "2026-10-03",
      ...authored, read_sections: authored.sections.map((s: object, i: number) => ({ ...s, heading_fil: fil[i].heading, body_fil: fil[i].body,
        heading_en: en[i].heading, body_en: en[i].body })), slides: json("slides.json") } } as PublishedLesson;
  const translation = structuredClone(json("pilot.ceb.json")) as LessonTranslation;
  // Deterministic audio and video fixtures exercise switching and caption selection.
  translation.narration = Object.fromEntries(translation.read_sections.map(section => [section.id, {
    src: `/fixture/${section.id}.ceb.mp3`, duration_seconds: 30,
    timings: buildNarrationZones(section).map((zone, i) => ({ ...zone, start_ms: i * 1000, end_ms: (i + 1) * 1000 })),
  }]));
  translation.video = { path: "/fixture/story.ceb.mp4", content_hash: "ceb", duration_s: 90,
    captions: { path: "/fixture/story.ceb.vtt", content_hash: "ceb-vtt" } };
  return { lesson, translation };
}
function view(preview = true, approved = false) {
  const { lesson, translation } = fixture();
  if (approved) translation.review_status = "approved";
  const resume = vi.fn().mockResolvedValue(undefined);
  const result = render(<ReferenceLessons title_fil="Manual" title_en="Manual" chapters={[]} lessons={[lesson]} completed={[]} resumes={[]}
    modules={[]} locale="fil" initialLessonId="lesson" lessonBaseHref="/lessons" readOnly={preview} translations={[translation]}
    onResume={resume} onComplete={vi.fn().mockResolvedValue(undefined)}/>);
  return { ...result, lesson, translation, resume };
}
const selectCebuano = () => fireEvent.change(screen.getByRole("combobox", { name: "Wika ng aralin" }), { target: { value: "ceb" } });

describe("lesson 1.1.1 Cebuano pilot", () => {
  it("binds translation to the complete source text and check answers", () => {
    const { lesson, translation } = fixture();
    expect(translation.source_text).toBe(lessonTranslationSource(lesson));
    expect(translationMatchesLesson(lesson, translation)).toBe(true);
    lesson.revision.read_sections[0].body_en += " Changed guidance.";
    expect(translationMatchesLesson(lesson, translation)).toBe(false);
  });
  it("does not offer draft translations to learners or an unrelated lesson", () => {
    const { lesson } = view(false);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(translationsForLesson(lesson, false)).toEqual([]);
    expect(translationsForLesson({ ...lesson, lesson_key: "bhw-health-educator" }, true)).toEqual([]);
  });
  it("rejects missing or misordered translated sections instead of mixing languages", () => {
    const { lesson, translation } = fixture();
    translation.read_sections.reverse();
    expect(translationMatchesLesson(lesson, translation)).toBe(false);
  });
  it("switches the entire reading view and matching audio, then restores Filipino", () => {
    const { container } = view();
    selectCebuano();
    expect(screen.getByRole("heading", { name: "Usa ka buntag, daghang buluhaton" })).toBeInTheDocument();
    expect(screen.getByText("Mapasabot kon giunsa pagkahiusa sa pagtudlo, pag-organisa, ug pagtabang sa serbisyo sa papel sa BHW.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Paminawa/ })).toBeInTheDocument();
    expect(container.querySelector("article")).toHaveAttribute("lang", "ceb");
    expect(container.querySelector("audio")).toHaveAttribute("src", "/fixture/morning.ceb.mp3");
    fireEvent.change(screen.getByRole("combobox", { name: "Pinulongan sa leksiyon" }), { target: { value: "" } });
    expect(screen.getByRole("heading", { name: "Isang umaga, maraming gawain" })).toBeInTheDocument();
    expect(container.querySelector("audio")).not.toBeInTheDocument();
  });
  it("translates slides, check choices, and feedback without revealing the summary early", () => {
    view(); selectCebuano();
    fireEvent.click(screen.getByRole("button", { name: "Mga slide" }));
    expect(screen.getByText("08:00 · Magtudlo")).toBeInTheDocument();
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Sunod nga bahin" }));
    expect(screen.queryByText("Mahimong ihiusa sa BHW ang pagtudlo, pag-organisa, ug pagtabang sa serbisyo.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Community Organizer" }));
    expect(screen.getByText("Sakto!")).toBeInTheDocument();
    expect(screen.getByText(/^Community Organizer: iyang/)).toBeInTheDocument();
  });
  it("selects Cebuano video and labels its captions correctly", () => {
    const { container } = view(); selectCebuano();
    fireEvent.click(screen.getByRole("button", { name: "Sugilanong adunay salaysay" }));
    expect(container.querySelector("video source")).toHaveAttribute("src", "/fixture/story.ceb.mp4");
    expect(container.querySelector("track")).toHaveAttribute("srcLang", "ceb");
    expect(container.querySelector("track")).toHaveAttribute("label", "Bisaya (Cebuano)");
  });
  it("keeps approved translation progress on the original stable revision and supported app language", async () => {
    const { resume, unmount } = view(false, true); selectCebuano();
    fireEvent.click(screen.getByRole("button", { name: "Mga slide" }));
    unmount(); // Flush the normal trailing resume debounce.
    await vi.waitFor(() => expect(resume).toHaveBeenCalled());
    expect(resume.mock.calls[0][0]).toMatchObject({ lesson_id: "lesson", revision_id: "revision", language: "fil", modality: "slides" });
  });
});

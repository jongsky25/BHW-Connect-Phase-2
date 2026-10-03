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
const json = (name: string, lessonDirectory = directory) => JSON.parse(readFileSync(path.join(lessonDirectory, name), "utf8"));
const parseRead = (language: string, lessonDirectory = directory) => readFileSync(path.join(lessonDirectory, `read.${language}.md`), "utf8")
  .split(/^## \[([^\]]+)\] (.+)\r?\n/gm).slice(1).reduce<{ id: string; heading: string; body: string }[]>((out, part, index, parts) => {
    if (index % 3 === 0) out.push({ id: part, heading: parts[index + 1], body: parts[index + 2].trim() });
    return out;
  }, []);
function fixture(language: "ceb" | "hil" = "ceb", lessonDirectory = directory) {
  const authored = json("lesson.json", lessonDirectory), fil = parseRead("fil", lessonDirectory), en = parseRead("en", lessonDirectory);
  const lesson = { ...authored.manifest, id: "lesson", module_id: "module", published_revision_id: "revision", created_at: "2026-10-03",
    revision: { id: "revision", lesson_id: "lesson", revision_key: "source", content_hash: "source", created_by: "author", created_at: "2026-10-03",
      ...authored, read_sections: authored.sections.map((s: object, i: number) => ({ ...s, heading_fil: fil[i].heading, body_fil: fil[i].body,
        heading_en: en[i].heading, body_en: en[i].body })), slides: json("slides.json", lessonDirectory) } } as PublishedLesson;
  const translation = structuredClone(json(`pilot.${language}.json`, lessonDirectory)) as LessonTranslation;
  // Exercise review gating independently of the owner's release status.
  translation.review_status = "draft";
  // Deterministic audio and video fixtures exercise switching and caption selection.
  translation.narration = Object.fromEntries(translation.read_sections.map(section => [section.id, {
    src: `/fixture/${section.id}.${language}.mp3`, duration_seconds: 30,
    timings: buildNarrationZones(section).map((zone, i) => ({ ...zone, start_ms: i * 1000, end_ms: (i + 1) * 1000 })),
  }]));
  translation.video = { path: `/fixture/story.${language}.mp4`, content_hash: language, duration_s: 90,
    captions: { path: `/fixture/story.${language}.vtt`, content_hash: `${language}-vtt` } };
  return { lesson, translation };
}
function view(preview = true, approved = false, language: "ceb" | "hil" = "ceb") {
  const { lesson, translation } = fixture(language);
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
    expect(translationsForLesson(lesson, false).map(t => t.language)).toEqual(["ceb", "hil"]);
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

describe("lesson 1.1.1 Hiligaynon pilot", () => {
  const selectHiligaynon = () => fireEvent.change(screen.getByRole("combobox", { name: "Wika ng aralin" }), { target: { value: "hil" } });
  it("offers the owner's approved languages to learners and hides stale translations", () => {
    const { lesson, translation } = fixture("hil");
    expect(translationMatchesLesson(lesson, translation)).toBe(true);
    expect(translationsForLesson(lesson, true).map(t => t.language)).toEqual(["ceb", "hil"]);
    expect(translationsForLesson(lesson, false).map(t => t.language)).toEqual(["ceb", "hil"]);
    lesson.revision.slides[0].display_fil += " Revised.";
    expect(translationsForLesson(lesson, true)).toEqual([]);
  });
  it("loads Hiligaynon reading, controls and audio, and restores Filipino", () => {
    const { container } = view(true, false, "hil"); selectHiligaynon();
    expect(screen.getByRole("heading", { name: "Isa ka aga, madamo nga buluhaton" })).toBeInTheDocument();
    expect(screen.getByText("Mapaathag kon paano nagaangot ang pagtudlo, pag-organisa, kag pagbulig sa serbisyo sa papel sang BHW.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pamatii/ })).toBeInTheDocument();
    expect(container.querySelector("audio")).toHaveAttribute("src", "/fixture/morning.hil.mp3");
    expect(container.querySelector("article")).toHaveAttribute("lang", "hil");
    fireEvent.change(screen.getByRole("combobox", { name: "Pinulongan sang leksiyon" }), { target: { value: "" } });
    expect(screen.getByRole("heading", { name: "Isang umaga, maraming gawain" })).toBeInTheDocument();
    expect(container.querySelector("audio")).not.toBeInTheDocument();
  });
  it("uses Hiligaynon slides and feedback with the original correct answer", () => {
    view(true, false, "hil"); selectHiligaynon();
    fireEvent.click(screen.getByRole("button", { name: "Mga slide" }));
    expect(screen.getByText("11:00 · Maggiya")).toBeInTheDocument();
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Masunod nga bahin" }));
    fireEvent.click(screen.getByRole("button", { name: "Health Educator lamang" }));
    expect(screen.getByText("Indi pa husto. Tilawi liwat.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Community Organizer" }));
    expect(screen.getByText("Husto!")).toBeInTheDocument();
    expect(screen.getByText(/^Community Organizer: gin-angot/)).toBeInTheDocument();
  });
  it("uses Hiligaynon video, captions and its text alternative", () => {
    const { container } = view(true, false, "hil"); selectHiligaynon();
    fireEvent.click(screen.getByRole("button", { name: "Sugilanon nga may salaysay" }));
    expect(container.querySelector("video source")).toHaveAttribute("src", "/fixture/story.hil.mp4");
    expect(container.querySelector("track")).toHaveAttribute("srcLang", "hil");
    expect(container.querySelector("track")).toHaveAttribute("label", "Hiligaynon (Ilonggo)");
    expect(screen.getByText("Mga tikang bilang teksto")).toBeInTheDocument();
  });
  it("replaces Cebuano media when switching directly to Hiligaynon", () => {
    const { lesson, translation: cebuano } = fixture();
    const { translation: hiligaynon } = fixture("hil");
    const { container } = render(<ReferenceLessons title_fil="Manual" title_en="Manual" chapters={[]} lessons={[lesson]} completed={[]}
      resumes={[]} modules={[]} locale="fil" initialLessonId="lesson" readOnly translations={[cebuano, hiligaynon]}
      onResume={vi.fn()} onComplete={vi.fn()}/>);
    selectCebuano();
    expect(container.querySelector("audio")).toHaveAttribute("src", "/fixture/morning.ceb.mp3");
    fireEvent.change(screen.getByRole("combobox", { name: "Pinulongan sa leksiyon" }), { target: { value: "hil" } });
    expect(container.querySelector("audio")).toHaveAttribute("src", "/fixture/morning.hil.mp3");
    expect(screen.getByRole("combobox", { name: "Pinulongan sang leksiyon" })).toHaveValue("hil");
  });
});

describe("lesson 1.1.2 approved translations", () => {
  const educatorDirectory = path.resolve(directory, "../bhw-health-educator");
  for (const language of ["ceb", "hil"] as const) {
    it(`offers the owner-approved ${language} package only for its matching source`, () => {
      const { lesson, translation } = fixture(language, educatorDirectory);
      expect(translationMatchesLesson(lesson, translation)).toBe(true);
      expect(translationsForLesson(lesson, false).map(t => t.language)).toEqual(["ceb", "hil"]);
      expect(translationsForLesson(lesson, true).map(t => t.language)).toEqual(["ceb", "hil"]);
      lesson.revision.read_sections[4].check!.correct_option_index = 1;
      expect(translationsForLesson(lesson, true)).toEqual([]);
    });
    it(`switches ${language} reading, slides, feedback and story media`, () => {
      const { lesson, translation } = fixture(language, educatorDirectory);
      const { container } = render(<ReferenceLessons title_fil="Manual" title_en="Manual" chapters={[]} lessons={[lesson]}
        completed={[]} resumes={[]} modules={[]} locale="fil" initialLessonId="lesson" readOnly translations={[translation]}
        onResume={vi.fn()} onComplete={vi.fn()}/>);
      fireEvent.change(screen.getByRole("combobox", { name: "Wika ng aralin" }), { target: { value: language } });
      expect(screen.getByRole("heading", { name: translation.read_sections[0].heading })).toBeInTheDocument();
      expect(screen.getByAltText(translation.story_art!.alt)).toBeInTheDocument();
      expect(container.querySelector("audio")).toHaveAttribute("src", `/fixture/educator-scene.${language}.mp3`);
      fireEvent.click(screen.getByRole("button", { name: translation.ui.Slides }));
      for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: translation.ui.Susunod }));
      const check = translation.slides[4].check!;
      fireEvent.click(screen.getByRole("button", { name: check.options[1] }));
      expect(screen.getByText(translation.ui["Hindi pa tama. Subukang muli."])).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: check.options[0] }));
      expect(screen.getByText(translation.ui["Tama!"])).toBeInTheDocument();
      expect(screen.getByText(check.feedback)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: translation.ui["Kuwentong may salaysay"] }));
      expect(container.querySelector("video source")).toHaveAttribute("src", `/fixture/story.${language}.mp4`);
      expect(container.querySelector("track")).toHaveAttribute("srcLang", language);
    });
  }
});

describe("lesson 1.1.3 approved translations", () => {
  const organizerDirectory = path.resolve(directory, "../bhw-community-organizer");
  for (const language of ["ceb", "hil"] as const) {
    it(`offers the approved ${language} source while keeping unapproved fixtures hidden`, () => {
      const { lesson, translation } = fixture(language, organizerDirectory);
      expect(translationMatchesLesson(lesson, translation)).toBe(true);
      expect(translationsForLesson(lesson, false).map(t => t.language)).toEqual(["ceb", "hil"]);
      expect(translationsForLesson(lesson, true).map(t => t.language)).toEqual(["ceb", "hil"]);
      render(<ReferenceLessons title_fil="Manual" title_en="Manual" chapters={[]} lessons={[lesson]} completed={[]}
        resumes={[]} modules={[]} locale="fil" initialLessonId="lesson" readOnly={false} translations={[translation]}
        onResume={vi.fn()} onComplete={vi.fn()}/>);
      expect(screen.queryByRole("combobox", { name: "Wika ng aralin" })).not.toBeInTheDocument();
      lesson.revision.read_sections[2].body_en += " Changed observation guidance.";
      expect(translationsForLesson(lesson, true)).toEqual([]);
    });
    it(`preserves answer index 2 and the ${language} Read, slide and video language`, () => {
      const { lesson, translation } = fixture(language, organizerDirectory);
      const { container } = render(<ReferenceLessons title_fil="Manual" title_en="Manual" chapters={[]} lessons={[lesson]}
        completed={[]} resumes={[]} modules={[]} locale="fil" initialLessonId="lesson" readOnly translations={[translation]}
        onResume={vi.fn()} onComplete={vi.fn()}/>);
      fireEvent.change(screen.getByRole("combobox", { name: "Wika ng aralin" }), { target: { value: language } });
      expect(screen.getByRole("heading", { name: translation.read_sections[0].heading })).toBeInTheDocument();
      expect(screen.getByAltText(translation.story_art.alt)).toBeInTheDocument();
      expect(container.querySelector("audio")).toHaveAttribute("src", `/fixture/organizer-scene.${language}.mp3`);
      for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole("button", { name: translation.ui.Susunod }));
      expect(container.querySelector("audio")).not.toBeInTheDocument();
      expect(lesson.revision.read_sections[5].check?.correct_option_index).toBe(2);
      const readCheck = translation.read_sections[5].check!;
      fireEvent.click(screen.getByRole("button", { name: readCheck.options[0] }));
      expect(screen.getByText(translation.ui["Hindi pa tama. Subukang muli."])).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: readCheck.options[2] }));
      expect(screen.getByText(translation.ui["Tama!"])).toBeInTheDocument();
      expect(screen.getByText(readCheck.feedback)).toBeInTheDocument();
      expect(container.querySelector("audio")).toHaveAttribute("src", `/fixture/check.${language}.mp3`);
      fireEvent.click(screen.getByRole("button", { name: translation.ui.Slides }));
      for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole("button", { name: translation.ui.Susunod }));
      fireEvent.click(screen.getByRole("button", { name: translation.slides[5].check!.options[2] }));
      expect(screen.getByText(translation.ui["Tama!"])).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: translation.ui["Kuwentong may salaysay"] }));
      expect(container.querySelector("video source")).toHaveAttribute("src", `/fixture/story.${language}.mp4`);
      expect(container.querySelector("track")).toHaveAttribute("srcLang", language);
    });
  }
});

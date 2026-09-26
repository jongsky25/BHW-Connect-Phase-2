import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LessonAssetFigure } from "./lesson-asset-figure";
import type { LessonAsset } from "@/lib/elearning/types";

afterEach(cleanup);

const image: LessonAsset = {
  id: "diagram",
  path: "/training/diagram-aaaaaaaaaaaa.svg",
  content_hash: "a".repeat(64),
  alt_fil: "Tatlong kahon",
  alt_en: "Three boxes",
  caption_fil: "Buod",
  caption_en: "Summary",
  provenance: "Original",
  review_status: "draft",
};
const clip: LessonAsset = {
  ...image,
  id: "clip",
  path: "/training/clip-aaaaaaaaaaaa-poster.jpg",
  alt_fil: "Walong hakbang: 1. Palad sa palad.",
  alt_en: "Eight steps: 1. Palm to palm.",
  video: { path: "/training/clip-bbbbbbbbbbbb.mp4", content_hash: "b".repeat(64), duration_s: 27 },
};

describe("LessonAssetFigure", () => {
  it("renders a plain asset as a lazy image", () => {
    render(<LessonAssetFigure asset={image} en />);
    const img = screen.getByRole("img", { name: "Three boxes" });
    expect(img).toHaveAttribute("src", image.path);
    expect(img).toHaveAttribute("loading", "lazy");
    expect(screen.getByText("Summary")).toBeInTheDocument();
  });

  it("renders a clip that never autoplays or preloads, with its poster and a text version", () => {
    const { container } = render(<LessonAssetFigure asset={clip} en={false} />);
    const video = container.querySelector("video")!;
    expect(video).toHaveAttribute("poster", clip.path);
    expect(video).toHaveAttribute("preload", "none");
    expect(video).toHaveAttribute("controls");
    expect(video).not.toHaveAttribute("autoplay");
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute("aria-label", clip.alt_fil);
    expect(container.querySelector("source")).toHaveAttribute("src", clip.video!.path);
    const text = screen.getByText(clip.alt_fil);
    expect(video).toHaveAttribute("aria-describedby", text.id);
    expect(screen.getByText("Mga hakbang bilang teksto")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("track")).toBeNull();
  });

  const narrated: LessonAsset = {
    ...clip,
    video: undefined,
    videos: {
      fil: {
        path: "/training/clip-fil-cccccccccccc.mp4", content_hash: "c".repeat(64), duration_s: 64,
        captions: { path: "/training/clip-fil-dddddddddddd.vtt", content_hash: "d".repeat(64) },
      },
      en: {
        path: "/training/clip-en-eeeeeeeeeeee.mp4", content_hash: "e".repeat(64), duration_s: 55,
        captions: { path: "/training/clip-en-ffffffffffff.vtt", content_hash: "f".repeat(64) },
      },
    },
  };

  it.each([
    [false, "fil", "Filipino"],
    [true, "en", "English"],
  ] as const)("plays a narrated clip in the learner's language with sound and captions (en=%s)", (en, lang, label) => {
    const { container } = render(<LessonAssetFigure asset={narrated} en={en} />);
    const video = container.querySelector("video")!;
    expect(video.muted).toBe(false);
    expect(video).toHaveAttribute("preload", "none");
    expect(video).not.toHaveAttribute("autoplay");
    expect(container.querySelector("source")).toHaveAttribute("src", narrated.videos![lang].path);
    const track = container.querySelector("track")!;
    expect(track).toHaveAttribute("kind", "captions");
    expect(track).toHaveAttribute("src", narrated.videos![lang].captions!.path);
    expect(track).toHaveAttribute("srclang", lang);
    expect(track).toHaveAttribute("label", label);
  });
});

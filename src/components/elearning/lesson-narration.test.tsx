import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, describe, expect, it, vi } from "vitest";
import enMessages from "../../../messages/en.json";
import { LessonNarration } from "./lesson-narration";
import type { CourseModuleAudio } from "@/lib/elearning/types";

// INC-27. jsdom implements neither HTMLMediaElement.play()/pause() nor
// requestAnimationFrame usefully — stubbed globally, same approach
// lesson-renderers.test.tsx already takes for scrollIntoView.
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HTMLMediaElement.prototype as any).play = vi.fn(function (
    this: HTMLMediaElement,
  ) {
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HTMLMediaElement.prototype as any).pause = vi.fn(function (
    this: HTMLMediaElement,
  ) {
    this.dispatchEvent(new Event("pause"));
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Element.prototype as any).scrollIntoView = vi.fn();
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 0));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

function withIntl(children: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

const matchingAudio: CourseModuleAudio = {
  id: "audio-1",
  module_id: "mod-1",
  section_index: 0,
  language: "en",
  audio_url: "https://example.supabase.co/training-audio/m1/0-en.webm",
  format: "opus",
  duration_seconds: 3,
  content_hash: "abc",
  timings: [
    { zone: "heading", index: 0, text: "Heading text", start_ms: 0, end_ms: 900 },
    { zone: "body", index: 0, text: "First sentence.", start_ms: 900, end_ms: 1900 },
    { zone: "body", index: 1, text: "Second sentence.", start_ms: 1900, end_ms: 2900 },
    { zone: "takeaway", index: 0, text: "Take this away.", start_ms: 2900, end_ms: 3500 },
  ],
};

describe("LessonNarration — matching audio", () => {
  it("renders a play control and every zone's text as a highlightable span", () => {
    render(
      withIntl(
        <LessonNarration
          audio={matchingAudio}
          heading="Heading text"
          body="First sentence. Second sentence."
          takeaway="Take this away."
        />,
      ),
    );

    expect(screen.getByRole("button", { name: "Play narration" })).toBeInTheDocument();
    expect(screen.getByText("Heading text")).toBeInTheDocument();
    expect(screen.getByText("First sentence.")).toBeInTheDocument();
    expect(screen.getByText("Second sentence.")).toBeInTheDocument();
    expect(screen.getByText("Take this away.")).toBeInTheDocument();
  });

  it("toggles play/pause label on click", async () => {
    const user = userEvent.setup();
    render(
      withIntl(
        <LessonNarration
          audio={matchingAudio}
          heading="Heading text"
          body="First sentence. Second sentence."
          takeaway="Take this away."
        />,
      ),
    );

    await user.click(screen.getByRole("button", { name: "Play narration" }));
    expect(screen.getByRole("button", { name: "Pause narration" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pause narration" }));
    expect(screen.getByRole("button", { name: "Play narration" })).toBeInTheDocument();
  });

  it("changes audio.playbackRate when a speed option is chosen", () => {
    render(
      withIntl(
        <LessonNarration
          audio={matchingAudio}
          heading="Heading text"
          body="First sentence. Second sentence."
          takeaway="Take this away."
        />,
      ),
    );

    const select = screen.getByLabelText("Speed") as HTMLSelectElement;
    const audioEl = document.querySelector("audio") as HTMLAudioElement;
    fireEvent.change(select, { target: { value: "1.5" } });
    expect(audioEl.playbackRate).toBe(1.5);
  });
});

describe("LessonNarration — visual as a render-prop (INC-28)", () => {
  it("passes not-playing progress before Play is pressed, and playing progress after", async () => {
    const user = userEvent.setup();
    const progressLog: Array<{ bodyIndex: number; playing: boolean }> = [];

    render(
      withIntl(
        <LessonNarration
          audio={matchingAudio}
          heading="Heading text"
          body="First sentence. Second sentence."
          takeaway="Take this away."
          visual={(progress) => {
            progressLog.push(progress);
            return <div data-testid="scene" />;
          }}
        />,
      ),
    );

    expect(screen.getByTestId("scene")).toBeInTheDocument();
    expect(progressLog[0]).toEqual({ bodyIndex: -1, playing: false });

    await user.click(screen.getByRole("button", { name: "Play narration" }));
    // requestAnimationFrame is stubbed to a no-op in this suite (see
    // beforeAll above), so activeIndex/bodyIndex never advances past its
    // initial value here — this checks the "narration has started, nothing
    // named yet" state, not a mid-playback one.
    expect(progressLog[progressLog.length - 1]).toEqual({ bodyIndex: -1, playing: true });
  });

  it("renders a plain visual node (not called as a function) unchanged", () => {
    render(
      withIntl(
        <LessonNarration
          audio={matchingAudio}
          heading="Heading text"
          body="First sentence. Second sentence."
          takeaway="Take this away."
          visual={<div data-testid="static-scene" />}
        />,
      ),
    );

    expect(screen.getByTestId("static-scene")).toBeInTheDocument();
  });
});

describe("LessonNarration — stale/mismatched audio", () => {
  it("degrades to the plain unhighlighted block, with no player control at all", () => {
    render(
      withIntl(
        <LessonNarration
          audio={matchingAudio}
          heading="Heading text"
          body="This text changed after the audio was rendered."
          takeaway="Take this away."
        />,
      ),
    );

    expect(
      screen.queryByRole("button", { name: "Play narration" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("This text changed after the audio was rendered."),
    ).toBeInTheDocument();
    expect(document.querySelector("audio")).not.toBeInTheDocument();
  });

  it("still calls a function visual, with not-playing progress", () => {
    render(
      withIntl(
        <LessonNarration
          audio={matchingAudio}
          heading="Heading text"
          body="This text changed after the audio was rendered."
          takeaway="Take this away."
          visual={(progress) => (
            <div data-testid="scene">{JSON.stringify(progress)}</div>
          )}
        />,
      ),
    );

    expect(screen.getByTestId("scene")).toHaveTextContent(
      JSON.stringify({ bodyIndex: -1, playing: false }),
    );
  });
});

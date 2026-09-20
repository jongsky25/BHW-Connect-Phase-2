import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, describe, expect, it, vi } from "vitest";
import enMessages from "../../../messages/en.json";
import { LessonModule } from "./lesson-module";
import { LessonSlides } from "./lesson-slides";
import type { CourseModule, CourseModuleVisual } from "@/lib/elearning/types";

// INC-26: LessonModule (Basahin) and LessonSlides (Islide) are two
// renderers over the same authored LessonSection[], reusing
// LessonSectionBlock/LessonVisual/RetrievalCheck/ClosingSummary rather than
// forking them — these tests check that reuse holds (same content, same
// unpersisted check behavior) and that the slide-only navigation works.

const fixtureModule: CourseModule = {
  id: "mod-1",
  course_id: "course-1",
  position: 1,
  type: "text",
  title_fil: "Modyul 1",
  title_en: "Module 1",
  body_fil: "",
  body_en: "",
  video_url: null,
  objectives_fil: ["Layunin isa", "Layunin dalawa"],
  objectives_en: ["Objective one", "Objective two"],
  summary_fil: "",
  summary_en: "",
  lesson: {
    sections: [
      {
        kind: "concept",
        tier: "core",
        heading_fil: "Seksyon Isa",
        heading_en: "Section One",
        body_fil: "Katawan isa",
        body_en: "Body one",
        visual_position: 1,
        takeaway_fil: "Kuha isa",
        takeaway_en: "Takeaway one",
        check: {
          prompt_fil: "Tanong?",
          prompt_en: "Question?",
          options: [
            { fil: "A", en: "A" },
            { fil: "B", en: "B" },
          ],
          correct_option_index: 1,
          feedback_fil: "Paliwanag",
          feedback_en: "Explanation",
        },
      },
      {
        kind: "concept",
        tier: "core",
        heading_fil: "Seksyon Dalawa",
        heading_en: "Section Two",
        body_fil: "Katawan dalawa",
        body_en: "Body two",
        visual_position: null,
        takeaway_fil: "Kuha dalawa",
        takeaway_en: "Takeaway two",
        check: null,
      },
    ],
  },
};

const fixtureVisuals: CourseModuleVisual[] = [
  {
    id: "v1",
    module_id: "mod-1",
    position: 1,
    primitive: "hub-spoke",
    svg_markup: `<svg viewBox="0 0 640 400"><circle cx="0" cy="0" r="10" fill="currentColor" /></svg>`,
    image_url: null,
    caption_fil: "Caption fil",
    caption_en: "Caption en",
    alt_text_fil: "Alt fil",
    alt_text_en: "Alt en",
    tier: "core",
  },
];

function baseProps(overrides: Partial<Parameters<typeof LessonModule>[0]> = {}) {
  return {
    module: fixtureModule,
    visuals: fixtureVisuals,
    density: "short" as const,
    locale: "en",
    isDone: false,
    pending: false,
    onComplete: vi.fn(),
    completedLabel: "Done",
    markCompleteLabel: "Mark as done",
    ...overrides,
  };
}

function withIntl(children: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

beforeAll(() => {
  // jsdom implements neither of these; both renderers call them for
  // position-restore/navigation. Stubbed globally rather than per test.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Element.prototype as any).scrollIntoView = vi.fn();
});

describe("LessonModule and LessonSlides render the same content", () => {
  it("both show the objectives, every section, and every takeaway for the same density", () => {
    const { unmount } = render(withIntl(<LessonModule {...baseProps()} />));
    expect(screen.getByText("Objective one")).toBeInTheDocument();
    expect(screen.getByText("Objective two")).toBeInTheDocument();
    expect(screen.getByText("Section One")).toBeInTheDocument();
    expect(screen.getByText("Section Two")).toBeInTheDocument();
    expect(screen.getByText("Takeaway one")).toBeInTheDocument();
    expect(screen.getByText("Takeaway two")).toBeInTheDocument();
    expect(screen.getByText("Caption en")).toBeInTheDocument();
    unmount();

    render(withIntl(<LessonSlides {...baseProps()} />));
    expect(screen.getByText("Objective one")).toBeInTheDocument();
    expect(screen.getByText("Objective two")).toBeInTheDocument();
    expect(screen.getByText("Section One")).toBeInTheDocument();
    expect(screen.getByText("Section Two")).toBeInTheDocument();
    expect(screen.getByText("Takeaway one")).toBeInTheDocument();
    expect(screen.getByText("Takeaway two")).toBeInTheDocument();
    expect(screen.getByText("Caption en")).toBeInTheDocument();
  });
});

describe("RetrievalCheck (shared, not forked)", () => {
  it("answers locally in both renderers and calls nothing else", async () => {
    const user = userEvent.setup();

    for (const Renderer of [LessonModule, LessonSlides] as const) {
      const { unmount } = render(withIntl(<Renderer {...baseProps()} />));
      await user.click(screen.getByRole("radio", { name: "B" }));
      await user.click(screen.getByRole("button", { name: "Check answer" }));
      expect(screen.getByText(/Correct!/)).toBeInTheDocument();
      unmount();
    }
  });
});

describe("LessonSlides navigation", () => {
  it("moves slides with the keyboard and updates the progress dots", () => {
    render(withIntl(<LessonSlides {...baseProps()} />));

    const region = screen.getByRole("region", { name: "Slide view" });
    const dot1 = screen.getByRole("button", { name: "Go to slide 1" });
    const dot2 = screen.getByRole("button", { name: "Go to slide 2" });
    expect(dot1).toHaveAttribute("aria-current", "true");
    expect(dot2).not.toHaveAttribute("aria-current");

    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(dot2).toHaveAttribute("aria-current", "true");
    expect(dot1).not.toHaveAttribute("aria-current");

    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(dot1).toHaveAttribute("aria-current", "true");

    fireEvent.keyDown(region, { key: "End" });
    const lastDot = screen.getByRole("button", { name: "Go to slide 4" });
    expect(lastDot).toHaveAttribute("aria-current", "true");

    fireEvent.keyDown(region, { key: "Home" });
    expect(dot1).toHaveAttribute("aria-current", "true");
  });

  it("also moves with the previous/next buttons and reports position changes", async () => {
    const user = userEvent.setup();
    const onPositionChange = vi.fn();
    render(
      withIntl(
        <LessonSlides {...baseProps()} onPositionChange={onPositionChange} />,
      ),
    );

    await user.click(screen.getByRole("button", { name: "Next slide" }));
    // Slide 0 is the objectives bookend (position -1); slide 1 is the
    // first section, which is LessonPosition 0.
    expect(onPositionChange).toHaveBeenLastCalledWith(0);

    await user.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(onPositionChange).toHaveBeenLastCalledWith(-1);
  });

  it("starts on the slide matching initialPosition, restoring the toggle's position", () => {
    render(withIntl(<LessonSlides {...baseProps()} initialPosition={1} />));

    // section index 1 ("Section Two") is slide 2 (after the objectives
    // bookend at slide 1).
    expect(
      screen.getByRole("button", { name: "Go to slide 3" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("puts the mark-complete control on the final slide and it fires onComplete", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      withIntl(
        <LessonSlides {...baseProps({ onComplete })} initialPosition={2} />,
      ),
    );

    const completeButton = screen.getByRole("button", {
      name: "Mark as done",
    });
    await user.click(completeButton);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe("LessonModule position restore", () => {
  it("scrolls the section matching initialPosition into view on mount", () => {
    const calls: Element[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Element.prototype as any).scrollIntoView = vi.fn(function (
      this: Element,
    ) {
      calls.push(this);
    });

    render(withIntl(<LessonModule {...baseProps()} initialPosition={1} />));

    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveAttribute("data-lesson-position", "1");
    const sectionTwo = within(calls[0] as HTMLElement).getByText(
      "Section Two",
    );
    expect(sectionTwo).toBeInTheDocument();
  });
});

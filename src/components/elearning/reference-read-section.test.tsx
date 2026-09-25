import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReferenceReadSection } from "./reference-read-section";
import type { ReferenceNarrationEntry } from "@/lib/elearning/reference-narration";

afterEach(cleanup);

const heading = "Kapag mabagal";
const body = 'Una, **huwag magalit**. Tanungin: "ano po ang status?"\n\nIkalawang talata.';
const takeaway = "Maging kalmado.";
const narration: ReferenceNarrationEntry = {
  src: "/training/audio/x.mp3",
  duration_seconds: 75,
  timings: [
    { zone: "heading", index: 0, text: heading, start_ms: 0, end_ms: 1000 },
    { zone: "body", index: 0, text: "Una, **huwag magalit**.", start_ms: 1000, end_ms: 2000 },
    { zone: "body", index: 1, text: 'Tanungin: "ano po ang status?"', start_ms: 2000, end_ms: 3000 },
    { zone: "body", index: 2, text: "Ikalawang talata.", start_ms: 3000, end_ms: 4000 },
    { zone: "takeaway", index: 0, text: takeaway, start_ms: 4000, end_ms: 5000 },
  ],
};

describe("ReferenceReadSection", () => {
  it("offers narration when the recorded text matches, keeping paragraphs and emphasis", () => {
    const { container } = render(
      <ReferenceReadSection heading={heading} body={body} takeaway={takeaway} narration={narration} en={false} />,
    );
    expect(screen.getByRole("group", { name: "Pakinggan ang bahaging ito" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pakinggan/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("1:15")).toBeInTheDocument();
    expect(container.querySelector("audio")).toHaveAttribute("preload", "none");
    expect(screen.getByText("huwag magalit").tagName).toBe("STRONG");
    expect(screen.getByText('Tanungin: "ano po ang status?"')).toBeInTheDocument();
    expect(screen.getByText("Ikalawang talata.").closest("p")).not.toBe(screen.getByText("huwag magalit").closest("p"));
  });

  it("highlights the sentence being spoken", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const { container } = render(
      <ReferenceReadSection heading={heading} body={body} takeaway={takeaway} narration={narration} en />,
    );
    const audio = container.querySelector("audio")!;
    Object.defineProperty(audio, "currentTime", { value: 2.5, configurable: true });
    fireEvent.play(audio);
    act(() => raf.mock.calls[0][0](0));
    expect(container.querySelector('[data-active="true"]')).toHaveTextContent('Tanungin: "ano po ang status?"');
    expect(screen.getByRole("button", { name: /Pause/ })).toHaveAttribute("aria-pressed", "true");
    expect(scroll).toHaveBeenCalled();
    raf.mockRestore();
  });

  it("hides the player when the lesson text changed after rendering", () => {
    render(
      <ReferenceReadSection heading={heading} body={body.replace("Una", "Una sa lahat")} takeaway={takeaway} narration={narration} en />,
    );
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.getByText(/Una sa lahat/)).toBeInTheDocument();
    expect(screen.getByText("huwag magalit").tagName).toBe("STRONG");
  });

  it("renders plain text without narration", () => {
    render(<ReferenceReadSection heading={heading} body={body} takeaway={takeaway} en />);
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(takeaway)).toBeInTheDocument();
  });
});

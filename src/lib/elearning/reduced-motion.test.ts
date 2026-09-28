import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion } from "./reduced-motion";

afterEach(() => {
  document.documentElement.removeAttribute("data-motion");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).matchMedia;
});

function stubMatchMedia(matches: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

describe("prefersReducedMotion", () => {
  it("returns false when neither the setting nor the OS preference asks for it", () => {
    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns true when the OS-level media query matches", () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("returns true when data-motion=reduce is set, even if the OS preference does not ask for it", () => {
    stubMatchMedia(false);
    document.documentElement.setAttribute("data-motion", "reduce");
    expect(prefersReducedMotion()).toBe(true);
  });
});

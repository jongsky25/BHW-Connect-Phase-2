import { describe, expect, it } from "vitest";
import { sanitizeSvgMarkup, validateSvgMarkup } from "./svg-allowlist";

const VALID_HUB_SPOKE = `
<svg viewBox="0 0 640 400">
  <title>Ang mga tungkulin ng BHW</title>
  <g class="hub" transform="translate(320,200)">
    <circle cx="0" cy="0" r="48" fill="currentColor" stroke="currentColor" stroke-width="2" />
    <text x="0" y="0" text-anchor="middle" font-size="14">BHW</text>
  </g>
  <g>
    <line x1="0" y1="0" x2="200" y2="0" stroke="currentColor" marker-end="url(#arrow)" />
    <polygon points="0,0 10,5 0,10" />
  </g>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
    </marker>
  </defs>
</svg>
`;

describe("validateSvgMarkup", () => {
  it("accepts a well-formed primitive using only allowed tags/attrs", () => {
    expect(validateSvgMarkup(VALID_HUB_SPOKE)).toEqual({ ok: true });
  });

  it("rejects empty markup", () => {
    const result = validateSvgMarkup("");
    expect(result.ok).toBe(false);
  });

  it("rejects <script>", () => {
    const result = validateSvgMarkup(`<svg viewBox="0 0 640 400"><script>alert(1)</script></svg>`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some((p) => p.includes("script"))).toBe(true);
  });

  it("rejects <foreignObject>", () => {
    const result = validateSvgMarkup(
      `<svg viewBox="0 0 640 400"><foreignObject><div>hi</div></foreignObject></svg>`,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some((p) => p.includes("foreignObject"))).toBe(true);
  });

  it("rejects <image>", () => {
    const result = validateSvgMarkup(`<svg viewBox="0 0 640 400"><image href="x.png" /></svg>`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some((p) => p.includes("image"))).toBe(true);
  });

  it("rejects <use>", () => {
    const result = validateSvgMarkup(`<svg viewBox="0 0 640 400"><use href="#icon" /></svg>`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some((p) => p.includes("use"))).toBe(true);
  });

  it("rejects an on* event handler attribute", () => {
    const result = validateSvgMarkup(`<svg viewBox="0 0 640 400"><rect onclick="alert(1)" /></svg>`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some((p) => p.toLowerCase().includes("onclick"))).toBe(true);
  });

  it("rejects an href attribute", () => {
    const result = validateSvgMarkup(`<svg viewBox="0 0 640 400"><path d="M0,0" href="https://evil.example" /></svg>`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some((p) => p.toLowerCase().includes("href"))).toBe(true);
  });

  it("rejects an xlink:href attribute", () => {
    const result = validateSvgMarkup(
      `<svg viewBox="0 0 640 400"><path d="M0,0" xlink:href="https://evil.example" /></svg>`,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some((p) => p.toLowerCase().includes("href"))).toBe(true);
  });

  it("rejects a style attribute", () => {
    const result = validateSvgMarkup(`<svg viewBox="0 0 640 400"><rect style="fill:red" /></svg>`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some((p) => p.toLowerCase().includes("style"))).toBe(true);
  });

  it("rejects a hex color literal", () => {
    const result = validateSvgMarkup(`<svg viewBox="0 0 640 400"><rect fill="#ff0000" /></svg>`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some((p) => p.toLowerCase().includes("hex"))).toBe(true);
  });

  it("rejects a tag not in the allowlist", () => {
    const result = validateSvgMarkup(`<svg viewBox="0 0 640 400"><linearGradient /></svg>`);
    expect(result.ok).toBe(false);
  });

  it("rejects an attribute not in the allowlist", () => {
    const result = validateSvgMarkup(`<svg viewBox="0 0 640 400"><rect data-foo="bar" /></svg>`);
    expect(result.ok).toBe(false);
  });

  it("accepts a data-scene-step attribute holding a positive integer", () => {
    expect(
      validateSvgMarkup(`<svg viewBox="0 0 640 400"><g data-scene-step="1"><circle r="1" /></g></svg>`),
    ).toEqual({ ok: true });
  });

  it("rejects a data-scene-step value that isn't a positive integer", () => {
    const result = validateSvgMarkup(`<svg viewBox="0 0 640 400"><g data-scene-step="0"></g></svg>`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some((p) => p.includes("data-scene-step"))).toBe(true);

    const notANumber = validateSvgMarkup(`<svg viewBox="0 0 640 400"><g data-scene-step="one"></g></svg>`);
    expect(notANumber.ok).toBe(false);
  });
});

describe("sanitizeSvgMarkup", () => {
  it("returns the markup unchanged when valid", () => {
    expect(sanitizeSvgMarkup(VALID_HUB_SPOKE)).toBe(VALID_HUB_SPOKE);
  });

  it("returns null rather than a stripped-down version when invalid", () => {
    expect(sanitizeSvgMarkup(`<svg viewBox="0 0 640 400"><script>alert(1)</script></svg>`)).toBeNull();
  });
});

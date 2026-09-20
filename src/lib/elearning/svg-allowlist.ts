// SVG allowlist for §A.2/§D authored training visuals (course_module_visuals.svg_markup).
//
// This markup is rendered into the page (dangerouslySetInnerHTML), so it is
// treated the same way parseKbDraft treats an untrusted structured output:
// reject loudly on anything outside the allowlist, never try to strip and
// repair. Two entry points, defense in depth per docs/training-modules-plan.md's
// INC-20 spec: the loader (INC-21) calls validateSvgMarkup on authored
// content before it ever reaches the database, and the renderer (INC-22)
// calls sanitizeSvgMarkup again immediately before dangerouslySetInnerHTML,
// in case a row reached the database some other way (an admin console, a
// future /admin/kb-style authoring UI). Both refuse identically — the
// renderer never "cleans" markup and renders a stripped-down version, it
// either renders the markup unchanged or renders nothing.

const ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "title",
  "defs",
  "marker",
]);

// "geometry" (§D/INC-20 spec) plus the marker-reference attributes that
// <marker>/<defs> are otherwise pointless without (an arrowhead is drawn via
// marker-end="url(#id)" on a path/line, which needs id + orient/markerWidth/
// markerHeight/refX/refY on the <marker> element itself). No href of any
// kind is ever allowed, including inside a url(#...) — see FORBIDDEN_ATTRS.
const ALLOWED_ATTRS = new Set([
  "viewBox",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "class",
  "text-anchor",
  "dominant-baseline",
  "transform",
  "font-size",
  "font-weight",
  "d",
  "points",
  "id",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "width",
  "height",
  "opacity",
  "marker-start",
  "marker-mid",
  "marker-end",
  "markerWidth",
  "markerHeight",
  "markerUnits",
  "orient",
  "refX",
  "refY",
  // INC-28: a positive-integer marker an animated scene's build-up reveals
  // progressively (see LessonVisual in lesson-module.tsx) — not a real SVG
  // attribute, but "data-*" is the one namespace HTML/SVG guarantees will
  // never collide with a future spec attribute.
  "data-scene-step",
]);

const FORBIDDEN_TAGS = ["script", "foreignObject", "image", "use"];

// #fff / #ffffff, anywhere in the markup — tokens.css is the only place in
// this repo allowed to hold a hex literal (§D).
const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{3}){1,2}\b/;

const SCENE_STEP_VALUE_RE = /^[1-9][0-9]*$/;

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*)?)\/?>/g;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"|([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*'([^']*)'/g;

export type SvgValidationResult = { ok: true } | { ok: false; problems: string[] };

/**
 * Validates authored SVG markup against the fixed allowlist. Used by the
 * content loader (INC-21) — an authoring mistake should fail CI, not load
 * with the offending part silently dropped.
 */
export function validateSvgMarkup(markup: string): SvgValidationResult {
  const problems: string[] = [];
  const trimmed = (markup ?? "").trim();

  if (trimmed.length === 0) {
    return { ok: false, problems: ["markup is empty"] };
  }

  if (HEX_COLOR_RE.test(trimmed)) {
    problems.push("contains a hex color literal — use currentColor or a tokens.css variable instead");
  }

  if (/\son[a-zA-Z]+\s*=/.test(trimmed)) {
    problems.push("contains an event handler attribute (on*)");
  }

  let match: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(trimmed)) !== null) {
    const [full, tagName, rawAttrs] = match;
    const isClosingTag = full.startsWith("</");

    if (FORBIDDEN_TAGS.includes(tagName)) {
      problems.push(`forbidden tag <${tagName}>`);
      continue;
    }

    if (!ALLOWED_TAGS.has(tagName)) {
      problems.push(`tag <${tagName}> is not in the allowlist`);
      continue;
    }

    if (isClosingTag || !rawAttrs) {
      continue;
    }

    let attrMatch: RegExpExecArray | null;
    ATTR_RE.lastIndex = 0;
    while ((attrMatch = ATTR_RE.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1] ?? attrMatch[3];
      const attrValue = attrMatch[2] ?? attrMatch[4] ?? "";

      if (/^(href|xlink:href)$/i.test(attrName)) {
        problems.push(`<${tagName}> has a forbidden href/xlink:href attribute`);
        continue;
      }

      if (attrName.toLowerCase() === "style") {
        problems.push(`<${tagName}> has a forbidden style attribute`);
        continue;
      }

      if (/^on[a-zA-Z]+$/i.test(attrName)) {
        problems.push(`<${tagName}> has a forbidden event handler attribute "${attrName}"`);
        continue;
      }

      if (!ALLOWED_ATTRS.has(attrName)) {
        problems.push(`<${tagName}> has attribute "${attrName}" which is not in the allowlist`);
      }

      if (attrName === "data-scene-step" && !SCENE_STEP_VALUE_RE.test(attrValue)) {
        problems.push(`<${tagName}> attribute "data-scene-step" must be a positive integer, got "${attrValue}"`);
      }

      if (HEX_COLOR_RE.test(attrValue)) {
        problems.push(`<${tagName}> attribute "${attrName}" contains a hex color literal`);
      }
    }
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  return { ok: true };
}

/**
 * Renderer-side defense in depth (INC-22): returns the markup unchanged if
 * it passes every allowlist rule, or null otherwise. Never returns a
 * "cleaned" partial markup — a rejected visual renders nothing rather than
 * a stripped-down guess at what the author meant.
 */
export function sanitizeSvgMarkup(markup: string): string | null {
  const result = validateSvgMarkup(markup);
  return result.ok ? markup : null;
}

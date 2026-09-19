// Plain-JS port of src/lib/elearning/svg-allowlist.ts's validateSvgMarkup, for
// the training content loader (scripts/training-load.mjs), which runs on
// plain Node with no build step (same reasoning scripts/lib/supabase-rest.mjs
// gives for not using the supabase-js client) — a .mjs script cannot import a
// .ts file directly without a TypeScript loader. Keep this in sync with the
// TS original by hand; both are covered by their own rejected-construct test
// suite (src/lib/elearning/svg-allowlist.test.ts and
// scripts/lib/training-content.test.mjs), so drift between the two shows up
// as a difference in what each accepts, not a silent gap.

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
]);

const FORBIDDEN_TAGS = ["script", "foreignObject", "image", "use"];

const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{3}){1,2}\b/;

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*)?)\/?>/g;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"|([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*'([^']*)'/g;

/** @returns {{ok: true} | {ok: false, problems: string[]}} */
export function validateSvgMarkup(markup) {
  const problems = [];
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

  let match;
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

    let attrMatch;
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

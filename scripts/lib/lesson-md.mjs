// Parses the lesson.fil.md / lesson.en.md directive syntax described in
// content/training/README.md into an array of section objects. Deliberately
// line-based, not a markdown-AST dependency (see that doc for why).
//
// A syntax error (bad heading, malformed check) throws a single Error whose
// message lists every problem found in that file, `file:line:` prefixed —
// scripts/lib/training-content.mjs catches this per-file and folds it into
// its own aggregate problem list, matching scripts/lib/kb-content.mjs's
// "collect everything, throw once" style.

const HEADING_RE = /^##\s*\[([a-z]+)\/([a-z]+)\]\s*(.+?)\s*$/;
// Optional trailing "{id, id}" on a heading — the §C.2 coverage markers naming
// which coverage.json concepts that section delivers. Split off the heading
// text so the marker never reaches the rendered heading.
const CONCEPT_MARKER_RE = /^(.*?)\s*\{([^{}]*)\}$/;
const KINDS = new Set(["scenario", "concept", "contrast", "practice"]);
const TIERS = new Set(["core", "standard", "deep"]);

function renderBody(lines) {
  const paragraphs = [];
  let buf = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (buf.length > 0) {
        paragraphs.push(buf.join(" ").trim());
        buf = [];
      }
    } else {
      buf.push(line.trim());
    }
  }
  if (buf.length > 0) paragraphs.push(buf.join(" ").trim());
  return paragraphs.join("\n\n");
}

function parseCheckBlock(bufferLines, file, blockStartLine, errors) {
  const where = (msg) => `${file}:${blockStartLine}: :::check block ${msg}`;
  let prompt = null;
  let feedback = null;
  const options = [];
  let target = null; // { type: "prompt" | "option" | "feedback", ref? }

  for (const raw of bufferLines) {
    const line = raw.trim();
    if (line === "") continue;

    if (line.startsWith("?")) {
      prompt = line.slice(1).trim();
      target = { type: "prompt" };
    } else if (line.startsWith("+")) {
      const option = { text: line.slice(1).trim(), correct: true };
      options.push(option);
      target = { type: "option", ref: option };
    } else if (line.startsWith("-")) {
      const option = { text: line.slice(1).trim(), correct: false };
      options.push(option);
      target = { type: "option", ref: option };
    } else if (line.startsWith(">")) {
      feedback = line.slice(1).trim();
      target = { type: "feedback" };
    } else if (target) {
      // continuation of the previous ?/-/+/> line
      if (target.type === "prompt") prompt = `${prompt} ${line}`;
      else if (target.type === "option") target.ref.text = `${target.ref.text} ${line}`;
      else if (target.type === "feedback") feedback = `${feedback} ${line}`;
    } else {
      errors.push(where(`has a line before any ?/-/+/> marker: "${line}"`));
    }
  }

  if (!prompt) errors.push(where("is missing a prompt line (starting with ?)"));
  if (options.length < 2) errors.push(where(`needs at least 2 options, has ${options.length}`));
  const correctCount = options.filter((o) => o.correct).length;
  if (correctCount !== 1) errors.push(where(`must mark exactly one option correct with +, found ${correctCount}`));
  if (!feedback) errors.push(where("is missing a feedback line (starting with >)"));

  if (!prompt || options.length < 2 || correctCount !== 1 || !feedback) return null;

  return {
    prompt,
    options,
    correctOptionIndex: options.findIndex((o) => o.correct),
    feedback,
  };
}

/**
 * @param {string} text
 * @param {string} file - path used in error messages, e.g. "modules/01-x/lesson.fil.md"
 * @returns {Array<{kind: string, tier: string, heading: string, body: string, visualPosition: number|null, takeaway: string|null, check: object|null}>}
 */
export function parseLessonMarkdown(text, file) {
  const lines = text.split(/\r?\n/);
  const errors = [];
  const sections = [];

  let current = null;
  let mode = "body"; // "body" | "takeaway" | "check"
  let buffer = [];

  const closeBlock = (lineNo) => {
    if (mode === "takeaway") {
      current.takeaway = buffer.join(" ").trim() || null;
    } else if (mode === "check") {
      current.check = parseCheckBlock(buffer, file, lineNo, errors);
    }
    mode = "body";
    buffer = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const line = lines[i];

    if (/^##\s/.test(line)) {
      if (mode !== "body") {
        errors.push(`${file}:${lineNo}: a new section heading appeared before ":::" closed the previous block`);
        mode = "body";
        buffer = [];
      }
      const match = line.match(HEADING_RE);
      if (!match) {
        errors.push(
          `${file}:${lineNo}: section heading is missing a required [kind/tier] tag, e.g. "## [scenario/core] ...": "${line.trim()}"`,
        );
        current = null;
        continue;
      }
      const [, kind, tier, rawHeading] = match;
      if (!KINDS.has(kind)) {
        errors.push(`${file}:${lineNo}: unknown section kind "${kind}" — must be one of ${[...KINDS].join(", ")}`);
      }
      if (!TIERS.has(tier)) {
        errors.push(`${file}:${lineNo}: unknown section tier "${tier}" — must be one of ${[...TIERS].join(", ")}`);
      }

      const markerMatch = rawHeading.match(CONCEPT_MARKER_RE);
      let heading = rawHeading;
      let conceptIds = [];
      if (markerMatch) {
        heading = markerMatch[1].trim();
        conceptIds = markerMatch[2]
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        if (heading === "") {
          errors.push(`${file}:${lineNo}: section heading is only a coverage marker, with no heading text`);
        }
        if (conceptIds.length === 0) {
          errors.push(`${file}:${lineNo}: section heading has an empty coverage marker "{}" — omit it instead`);
        }
        const seen = new Set();
        for (const id of conceptIds) {
          if (seen.has(id)) errors.push(`${file}:${lineNo}: coverage marker repeats concept id "${id}"`);
          seen.add(id);
        }
      }

      current = {
        kind,
        tier,
        heading,
        conceptIds,
        bodyLines: [],
        visualPosition: null,
        takeaway: null,
        check: null,
      };
      sections.push(current);
      continue;
    }

    if (!current) {
      if (line.trim() !== "") {
        errors.push(`${file}:${lineNo}: content before the first section heading: "${line.trim()}"`);
      }
      continue;
    }

    const visualMatch = mode === "body" ? line.match(/^:::visual\s+(\d+)\s*$/) : null;
    if (visualMatch) {
      current.visualPosition = Number(visualMatch[1]);
      continue;
    }

    if (line.trim() === ":::takeaway" && mode === "body") {
      mode = "takeaway";
      buffer = [];
      continue;
    }
    if (line.trim() === ":::check" && mode === "body") {
      mode = "check";
      buffer = [];
      continue;
    }
    if (line.trim() === ":::" && mode !== "body") {
      closeBlock(lineNo);
      continue;
    }

    if (mode === "body") {
      current.bodyLines.push(line);
    } else {
      buffer.push(line);
    }
  }

  if (mode !== "body") {
    errors.push(`${file}: reached end of file with an unclosed ":::${mode}" block`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return sections.map((s) => ({
    kind: s.kind,
    tier: s.tier,
    heading: s.heading,
    conceptIds: s.conceptIds,
    body: renderBody(s.bodyLines),
    visualPosition: s.visualPosition,
    takeaway: s.takeaway,
    check: s.check,
  }));
}

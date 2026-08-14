// Markdown -> Tiptap JSONContent, restricted to the node and mark types that
// @tiptap/starter-kit actually renders in src/components/kb/article-viewer.tsx:
// heading (levels 1-3), paragraph, bulletList, orderedList, listItem, and the
// bold / italic / code marks. Anything else is a hard error rather than a silent
// drop, because a body that loses content on load is worse than one that fails.

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const ORDERED = /^(\d+)[.)]\s+(.*)$/;

const UNSUPPORTED = [
  [/^\s*>/, "blockquote"],
  [/^\s*```/, "code block"],
  [/^\s*(-{3,}|\*{3,}|_{3,})\s*$/, "horizontal rule"],
  [/^\s*\|/, "table"],
  [/!\[[^\]]*\]\(/, "image"],
  [/\[[^\]]+\]\([^)]+\)/, "link"],
  [/^#{4,}\s/, "heading below level 3"],
];

function assertSupported(line, file) {
  for (const [pattern, what] of UNSUPPORTED) {
    if (pattern.test(line)) {
      throw new Error(`${file}: unsupported markdown (${what}) in line: ${line.trim()}`);
    }
  }
}

// Inline marks. Order matters: code first so ** inside backticks is left alone.
function inlineNodes(text, file) {
  const nodes = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push({ type: "text", text: text.slice(cursor, match.index) });
    }
    if (match[1]) {
      nodes.push({ type: "text", text: match[1].slice(1, -1), marks: [{ type: "code" }] });
    } else if (match[2]) {
      nodes.push({ type: "text", text: match[2].slice(2, -2), marks: [{ type: "bold" }] });
    } else {
      nodes.push({ type: "text", text: match[3].slice(1, -1), marks: [{ type: "italic" }] });
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) nodes.push({ type: "text", text: text.slice(cursor) });
  if (nodes.length === 0) throw new Error(`${file}: empty inline content`);
  return nodes;
}

function listItem(text, file) {
  return { type: "listItem", content: [{ type: "paragraph", content: inlineNodes(text, file) }] };
}

/**
 * @param {string} markdown raw file contents
 * @param {string} file path used in error messages
 * @returns {{type: "doc", content: object[]}} Tiptap JSONContent
 */
export function markdownToTiptap(markdown, file = "<markdown>") {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const content = [];
  let list = null; // { type, content }
  let paragraph = null; // string[]

  const flushParagraph = () => {
    if (!paragraph) return;
    content.push({ type: "paragraph", content: inlineNodes(paragraph.join(" "), file) });
    paragraph = null;
  };
  const flushList = () => {
    if (!list) return;
    content.push(list);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    assertSupported(line, file);

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      content.push({
        type: "heading",
        attrs: { level: heading[1].length },
        content: inlineNodes(heading[2].trim(), file),
      });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      flushParagraph();
      if (list && list.type !== "bulletList") flushList();
      if (!list) list = { type: "bulletList", content: [] };
      list.content.push(listItem(bullet[1].trim(), file));
      continue;
    }

    const ordered = ORDERED.exec(line);
    if (ordered) {
      flushParagraph();
      if (list && list.type !== "orderedList") flushList();
      if (!list) list = { type: "orderedList", attrs: { start: Number(ordered[1]) }, content: [] };
      list.content.push(listItem(ordered[2].trim(), file));
      continue;
    }

    // A plain line that follows a list item continues that item's paragraph;
    // in this corpus that never happens, so treat it as a new paragraph.
    flushList();
    paragraph = paragraph ?? [];
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();

  if (content.length === 0) throw new Error(`${file}: produced an empty document`);
  return { type: "doc", content };
}

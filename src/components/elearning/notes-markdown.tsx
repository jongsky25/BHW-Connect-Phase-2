import type { ReactNode } from "react";

// Small renderer for authored facilitator notes: paragraphs, ### headings,
// bullet and numbered lists (indented lines continue an item), tables,
// **bold**, *italic* and `code`. Builds React elements only — never raw
// HTML — so authored text cannot inject markup.

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    if (token.startsWith("**")) out.push(<strong key={at}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={at} className="rounded bg-ink/5 px-1">{token.slice(1, -1)}</code>);
    else out.push(<em key={at}>{token.slice(1, -1)}</em>);
    last = at + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "table"; rows: string[][] };

function blocks(markdown: string): Block[] {
  const result: Block[] = [];
  const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  for (const raw of markdown.replaceAll("\r", "").split("\n")) {
    const line = raw.trimEnd();
    const prev = result.at(-1);
    const bullet = /^\s*[-*] (.*)$/.exec(line);
    const numbered = /^\s*\d+[.)] (.*)$/.exec(line);
    if (!line.trim()) {
      result.push({ kind: "p", text: "" });
    } else if (line.startsWith("#")) {
      result.push({ kind: "h", text: line.replace(/^#+\s*/, "") });
    } else if (line.trim().startsWith("|")) {
      if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line)) continue;
      if (prev?.kind === "table") prev.rows.push(cells(line));
      else result.push({ kind: "table", rows: [cells(line)] });
    } else if (bullet || numbered) {
      const kind = bullet ? "ul" : "ol";
      const text = (bullet ?? numbered)![1];
      // A top-level item keeps building the current list; an indented item
      // of the other type is folded into the current item.
      if (prev?.kind === kind) prev.items.push(text);
      else if ((prev?.kind === "ul" || prev?.kind === "ol") && /^\s+/.test(line)) prev.items[prev.items.length - 1] += `\n${text}`;
      else result.push({ kind, items: [text] });
    } else if ((prev?.kind === "ul" || prev?.kind === "ol") && /^\s+/.test(raw)) {
      prev.items[prev.items.length - 1] += ` ${line.trim()}`;
    } else if (prev?.kind === "p" && prev.text) {
      prev.text += ` ${line.trim()}`;
    } else {
      result.push({ kind: "p", text: line.trim() });
    }
  }
  return result.filter((b) => b.kind !== "p" || b.text);
}

export function NotesMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="flex flex-col gap-3 text-ink/85">
      {blocks(markdown).map((block, i) => {
        if (block.kind === "h") return <p key={i} className="font-semibold text-ink">{inline(block.text)}</p>;
        if (block.kind === "p") return <p key={i}>{inline(block.text)}</p>;
        if (block.kind === "table") {
          const [head, ...body] = block.rows;
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>{head.map((c, j) => <th key={j} className="border-b border-ink/20 px-2 py-1 text-left font-semibold">{inline(c)}</th>)}</tr>
                </thead>
                <tbody>
                  {body.map((row, r) => (
                    <tr key={r}>{row.map((c, j) => <td key={j} className="border-b border-ink/10 px-2 py-1 align-top">{inline(c)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        const List = block.kind === "ul" ? "ul" : "ol";
        return (
          <List key={i} className={`${block.kind === "ul" ? "list-disc" : "list-decimal"} flex flex-col gap-1 pl-5`}>
            {block.items.map((item, j) => (
              <li key={j}>
                {item.split("\n").map((part, k) => (k ? <span key={k} className="mt-1 block pl-3">– {inline(part)}</span> : <span key={k}>{inline(part)}</span>))}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

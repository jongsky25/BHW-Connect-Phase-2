export type SpotElement = { selector: string; label: string; tag: string };

// Capture a useful location without copying arbitrary page text, form values,
// or patient details into the feedback record.
export function describeSpot(element: Element): SpotElement {
  const tag = element.tagName.toLowerCase();
  const parts: string[] = [];
  let node: Element | null = element;
  for (let depth = 0; node && depth < 6; depth += 1) {
    const testId = node.getAttribute("data-testid");
    if (testId) {
      parts.unshift(`[data-testid="${CSS.escape(testId)}"]`);
      break;
    }
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    let part = node.tagName.toLowerCase();
    const siblings = node.parentElement
      ? Array.from(node.parentElement.children).filter((child) => child.tagName === node!.tagName)
      : [];
    if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    parts.unshift(part);
    node = node.parentElement;
  }
  const label = element.getAttribute("aria-label")
    ?? (["button", "a", "label"].includes(tag) ? element.textContent : null)
    ?? "";
  return { selector: parts.join(" > ").slice(0, 500), label: label.replace(/\s+/g, " ").trim().slice(0, 160), tag };
}

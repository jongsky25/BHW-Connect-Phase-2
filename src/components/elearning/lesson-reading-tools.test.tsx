import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { LessonReadingTools } from "./lesson-reading-tools";
afterEach(cleanup);
function ReaderState() {
  const [answer, setAnswer] = useState("");
  return <section><article data-layout="read"><label>Practice answer<input value={answer} onChange={event => setAnswer(event.target.value)} /></label><p>Original teaching text</p></article></section>;
}
it.each(["en", "fil"])("offers labeled layout/help controls and preserves reader state (%s)", async locale => {
  const user = userEvent.setup();
  const view = render(<LessonReadingTools locale={locale}><ReaderState /></LessonReadingTools>);
  await user.click(screen.getByText(locale === "en" ? "Reading tools" : "Mga tulong sa pagbasa", { exact: true }));
  const comfortable = screen.getByRole("button", { name: locale === "en" ? "Comfortable" : "Maluwag" });
  const standard = screen.getByRole("button", { name: locale === "en" ? "Standard" : "Karaniwan" });
  expect(comfortable).toHaveAttribute("aria-pressed", "true");
  await user.type(screen.getByLabelText("Practice answer"), "Keep this answer");
  await user.click(standard);
  expect(standard).toHaveAttribute("aria-pressed", "true");
  expect(view.container.firstElementChild).toHaveAttribute("data-reading-layout", "standard");
  await user.click(comfortable);
  expect(screen.getByLabelText("Practice answer")).toHaveValue("Keep this answer");
  await user.click(screen.getByText(locale === "en" ? "How to use the lesson controls" : "Paano gamitin ang mga kontrol ng aralin"));
  expect(screen.getByText(locale === "en" ? "Read / Slides" : "Basahin / Slides")).toBeVisible();
  expect(screen.getByText("Original teaching text")).toBeInTheDocument();
});

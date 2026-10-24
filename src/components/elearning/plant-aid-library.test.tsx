import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PlantAidLibrary } from "./plant-aid-library";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("finds a card by botanical name, keeps the source and uncertainty guidance, and handles no matches", () => {
  render(<PlantAidLibrary initialLanguage="en" feedbackAvailable />);
  expect(screen.getAllByRole("article")).toHaveLength(10);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "  Carmona  " } });
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "Tsaang-gubat" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "PITAHC: Tsaang-gubat" })).toHaveAttribute("href", "https://pitahc.gov.ph/herbs-directory/#tsaang-gubat");
  fireEvent.click(screen.getByText("Show a possible response"));
  expect(screen.getByText(/do not recommend preparation or use/)).toBeInTheDocument();
  expect(screen.getByText(/Use the page comment button/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no such plant" } });
  expect(screen.queryAllByRole("article")).toHaveLength(0);
  expect(screen.getByText(/No matching card/)).toBeInTheDocument();
});

it("switches card and guidance language while keeping the selected botanical search", () => {
  render(<PlantAidLibrary initialLanguage="en" feedbackAvailable />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Vitex" } });
  fireEvent.click(screen.getByRole("button", { name: "Filipino" }));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mga reference aid sa halaman");
  expect(screen.getByText("Dahon")).toBeInTheDocument();
  expect(screen.getByRole("searchbox")).toHaveValue("Vitex");
  expect(screen.getByRole("button", { name: "Filipino" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText(/button para sa komento/)).toBeInTheDocument();
});

it("prints the current selection without adding a false approval or requiring feedback access", () => {
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  render(<PlantAidLibrary initialLanguage="fil" feedbackAvailable={false} />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Allium" } });
  fireEvent.click(screen.getByRole("button", { name: "I-print ang mga card" }));
  expect(print).toHaveBeenCalledOnce();
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByText(/Suriin ang salita, salin/)).toBeInTheDocument();
  expect(screen.getByText(/Nakabinbin pa ang clinical verification/)).toBeInTheDocument();
  expect(screen.getByText("Ray Justin Ventura", { selector: "strong" })).toBeInTheDocument();
});

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ContentClarificationLibrary } from "./content-clarification-library";

afterEach(cleanup);

it("provides four addressable topics, source links and unscored practice responses", () => {
  render(<ContentClarificationLibrary initialLanguage="en" feedbackAvailable />);
  expect(screen.getAllByRole("article")).toHaveLength(4);
  expect(screen.getByRole("link", { name: "A provider network and a referral are different" })).toHaveAttribute("href", "#network-referral");
  const network = screen.getByRole("article", { name: "A provider network and a referral are different" });
  fireEvent.click(within(network).getByText("Show a possible response"));
  expect(within(network).getByText(/Sam asks about the provider network/)).toBeInTheDocument();
  expect(within(network).getByRole("link", { name: /RA 11223/ })).toHaveAttribute("href", "https://lawphil.net/statutes/repacts/ra2019/ra_11223_2019.html");
  expect(screen.getByText(/Use the page comment button/)).toBeInTheDocument();
  expect(screen.getByText(/fictional practice scores/)).toBeInTheDocument();
  expect(screen.getByText(/does not prove that training is the main cause/)).toBeInTheDocument();
});

it("switches explanations, practice and feedback guidance to Filipino", () => {
  render(<ContentClarificationLibrary initialLanguage="en" feedbackAvailable={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Filipino" }));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mga paglilinaw sa aralin");
  expect(screen.getByRole("article", { name: "Magkaiba ang provider network at referral" })).toBeInTheDocument();
  expect(screen.getAllByText("Ipakita ang maaaring tugon")).toHaveLength(4);
  expect(screen.getByText(/Suriin ang mga paliwanag kasama/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Filipino" })).toHaveAttribute("aria-pressed", "true");
});

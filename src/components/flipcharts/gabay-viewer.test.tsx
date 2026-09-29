import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { gabayCharts } from "@/lib/flipcharts/gabay-charts";
import { GabayViewer } from "./gabay-viewer";

describe("Gabay flipchart reader", () => {
  it("keeps BHW notes separate from patient cards and switches both languages", () => {
    render(<GabayViewer chart={gabayCharts[0]} initialLocale="fil" />);
    expect(screen.getByText("Pumili ng accredited YAKAP clinic na maaabot mo.")).toBeInTheDocument();
    expect(screen.queryByText(/May PIN na po ba kayo/)).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Residente na pumipili/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tala para sa BHW" }));
    expect(screen.getByText(/May PIN na po ba kayo/)).toBeInTheDocument();
    expect(screen.queryByText("Pumili ng accredited YAKAP clinic na maaabot mo.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PH-05: Accredited facilities/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByText(/Do you have a PIN/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Patient cards" }));
    expect(screen.getByText("Choose an accredited YAKAP clinic you can reach.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Visit the clinic for the FPE; ask how consultation follows.")).toBeInTheDocument();
  });
});

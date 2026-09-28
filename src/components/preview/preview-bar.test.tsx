import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "../../../messages/en.json";
import { PreviewBar } from "./preview-bar";

const state = vi.hoisted(() => ({ startPreview: vi.fn(), endPreview: vi.fn(), assign: vi.fn() }));
vi.mock("@/app/actions/preview", () => ({
  startPreview: state.startPreview,
  endPreview: state.endPreview,
}));

beforeEach(() => {
  state.startPreview.mockReset().mockResolvedValue({ ok: true });
  state.endPreview.mockReset().mockResolvedValue({ ok: true });
  state.assign.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign: state.assign },
  });
});
afterEach(cleanup);

function renderBar(role: "bhw" | "assessor" | "designer" = "bhw") {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <PreviewBar role={role} />
    </NextIntlClientProvider>,
  );
}

describe("PreviewBar", () => {
  it("shows the banner naming the previewed role, as a status region", () => {
    renderBar("bhw");
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Previewing as BHW");
  });

  it("lists only the other previewable roles in the Switch menu", () => {
    renderBar("bhw");
    fireEvent.click(screen.getByRole("button", { name: /Switch/ }));
    expect(screen.getByRole("button", { name: "Facilitator / Assessor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Designer" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "BHW" })).not.toBeInTheDocument();
  });

  it("switching calls startPreview and navigates to /home on success", async () => {
    renderBar("bhw");
    fireEvent.click(screen.getByRole("button", { name: /Switch/ }));
    fireEvent.click(screen.getByRole("button", { name: "Designer" }));

    await waitFor(() => expect(state.startPreview).toHaveBeenCalledWith("designer"));
    await waitFor(() => expect(state.assign).toHaveBeenCalledWith("/home"));
  });

  it("exiting calls endPreview and navigates to /admin/dashboard on success", async () => {
    renderBar("bhw");
    fireEvent.click(screen.getByRole("button", { name: "Exit preview" }));

    await waitFor(() => expect(state.endPreview).toHaveBeenCalled());
    await waitFor(() => expect(state.assign).toHaveBeenCalledWith("/admin/dashboard"));
  });

  it("shows an error and does not navigate when the action fails", async () => {
    state.endPreview.mockResolvedValue({ ok: false, error: "genericError" });
    renderBar("bhw");
    fireEvent.click(screen.getByRole("button", { name: "Exit preview" }));

    await waitFor(() =>
      expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument(),
    );
    expect(state.assign).not.toHaveBeenCalled();
  });
});

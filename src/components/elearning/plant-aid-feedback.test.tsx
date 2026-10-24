import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { SpotFeedbackWidget } from "@/components/spot-feedback/spot-feedback-widget";
import { PlantAidLibrary } from "./plant-aid-library";

vi.mock("@/components/preview/preview-provider", () => ({ usePreview: () => false }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });

it("submits feedback on a particular pilot card through the existing feature", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetch);
  window.history.replaceState({}, "", "/plant-aids");
  render(<NextIntlClientProvider locale="en" messages={en}>
    <PlantAidLibrary initialLanguage="en" feedbackAvailable />
    <SpotFeedbackWidget />
  </NextIntlClientProvider>);
  const heading = screen.getByRole("heading", { name: "Lagundi" });
  document.elementFromPoint = () => heading;
  fireEvent.click(screen.getByRole("button", { name: "Comment on this page" }));
  fireEvent.click(heading);
  expect(screen.getByRole("dialog", { name: "Page comment" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("What would you like us to know?"), { target: { value: "Please make the part label clearer." } });
  fireEvent.click(screen.getByRole("button", { name: "Send comment" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe("/api/spot-feedback");
  expect(options.body.get("page_path")).toBe("/plant-aids");
  expect(options.body.get("element_selector")).toBe("#plant-title-lagundi");
  expect(options.body.get("message")).toBe("Please make the part label clearer.");
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { SpotFeedbackWidget } from "./spot-feedback-widget";

const capture = vi.hoisted(() => vi.fn());
vi.mock("@/components/preview/preview-provider", () => ({ usePreview: () => false }));
vi.mock("html2canvas-pro", () => ({ default: capture }));

beforeEach(() => {
  capture.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  document.elementFromPoint = () => document.querySelector("#target");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SpotFeedbackWidget", () => {
  it("sends page and element context without capturing a screenshot unless requested", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <button id="target" type="button">Open chat</button>
        <SpotFeedbackWidget />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Comment on this page" }));
    fireEvent.click(screen.getByRole("button", { name: "Open chat" }));
    expect(screen.getByRole("dialog", { name: "Page comment" })).toBeInTheDocument();
    expect(capture).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("What would you like us to know?"), {
      target: { value: "The button is confusing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send comment" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [path, options] = vi.mocked(fetch).mock.calls[0];
    expect(path).toBe("/api/spot-feedback");
    const form = options?.body as FormData;
    expect(form.get("message")).toBe("The button is confusing");
    expect(form.get("element_tag")).toBe("button");
    expect(form.get("screenshot")).toBeNull();
  });
});

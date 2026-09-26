import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "../../../messages/en.json";
import { defaultA11ySettings } from "@/lib/settings/types";
import { SettingsForm } from "./settings-form";

const state = vi.hoisted(() => ({
  rpcCalls: [] as Array<{ name: string; args: unknown }>,
  push: vi.fn(),
  refresh: vi.fn(),
  nextError: null as { message: string } | null,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push, refresh: state.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args });
      if (state.nextError) {
        const error = state.nextError;
        state.nextError = null;
        return { error };
      }
      return { error: null };
    },
  }),
}));

beforeEach(() => {
  state.rpcCalls = [];
  state.nextError = null;
  state.push.mockReset();
  state.refresh.mockReset();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-font-scale");
  document.documentElement.removeAttribute("data-contrast");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const renderForm = () =>
  render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <SettingsForm initialLanguage="fil" initialA11y={defaultA11ySettings} />
    </NextIntlClientProvider>,
  );

describe("SettingsForm", () => {
  it("applies a theme change to <html> immediately, before the debounced save resolves", () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(state.rpcCalls).toEqual([]);
  });

  it("debounces rapid display changes into a single rpc_update_display_settings call", async () => {
    vi.useFakeTimers();
    renderForm();

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    fireEvent.click(screen.getByRole("radio", { name: "Extra large" }));
    fireEvent.click(screen.getByRole("radio", { name: "High" }));

    await vi.advanceTimersByTimeAsync(600);

    expect(state.rpcCalls).toEqual([
      {
        name: "rpc_update_display_settings",
        args: { p_settings: { theme: "dark", font_scale: "xl", high_contrast: true } },
      },
    ]);
  });

  it("reverts the attribute and shows an error when the save fails", async () => {
    state.nextError = { message: "invalid display setting: theme" };
    renderForm();

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));

    await waitFor(
      () => expect(screen.getByRole("alert")).toHaveTextContent("That setting isn't valid. Please try again."),
      { timeout: 2000 },
    );
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("resets every display setting to its default and saves the full object", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset now" }));

    await waitFor(() =>
      expect(state.rpcCalls.at(-1)).toEqual({
        name: "rpc_update_display_settings",
        args: { p_settings: defaultA11ySettings },
      }),
    );
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("saves language together with the current display settings and refreshes", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() =>
      expect(state.rpcCalls).toContainEqual({
        name: "rpc_update_settings",
        args: { p_language: "en", p_theme: "system", p_font_scale: "md", p_high_contrast: false },
      }),
    );
    expect(state.refresh).toHaveBeenCalled();
  });
});

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  document.documentElement.removeAttribute("data-density");
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

  it("applies a density change to <html> immediately, before the debounced save resolves", () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Compact" }));

    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
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

  it("shows the default Bayanihan preset as selected, with no 'Custom' badge", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Bayanihan" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Custom")).not.toBeInTheDocument();
  });

  it("picking a preset sets both the main and accent colour swatches", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Garden" }));

    await waitFor(() =>
      expect(state.rpcCalls).toContainEqual({
        name: "rpc_update_display_settings",
        args: { p_settings: { primary_color: "emerald", accent_color: "violet" } },
      }),
    );
    expect(within(screen.getByRole("group", { name: "Main colour" })).getByRole("radio", { name: "Emerald" })).toBeChecked();
    expect(within(screen.getByRole("group", { name: "Accent colour" })).getByRole("radio", { name: "Violet" })).toBeChecked();
  });

  it("changing just the main colour swatch shows 'Custom' instead of any preset", async () => {
    renderForm();
    const mainGroup = within(screen.getByRole("group", { name: "Main colour" }));
    fireEvent.click(mainGroup.getByRole("radio", { name: "Rose" }));

    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bayanihan" })).toHaveAttribute("aria-pressed", "false");
  });

  it("warns when the main and accent colours match", () => {
    renderForm();
    expect(screen.queryByText(/Links may be harder to spot/)).not.toBeInTheDocument();

    const accentGroup = within(screen.getByRole("group", { name: "Accent colour" }));
    fireEvent.click(accentGroup.getByRole("radio", { name: "Marigold" }));

    expect(screen.getByText(/Links may be harder to spot/)).toBeInTheDocument();
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

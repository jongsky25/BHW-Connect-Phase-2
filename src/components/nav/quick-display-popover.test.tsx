import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { defaultA11ySettings } from "@/lib/settings/types";
import { QuickDisplayPopover } from "./quick-display-popover";

const state = vi.hoisted(() => ({ rpcCalls: [] as Array<{ name: string; args: unknown }> }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args });
      return { error: null };
    },
  }),
}));

beforeEach(() => {
  state.rpcCalls = [];
  document.documentElement.removeAttribute("data-theme");
  document.cookie = "BHW_DISPLAY=; max-age=0; path=/";
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function show(signedIn = true) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <QuickDisplayPopover initialA11y={defaultA11ySettings} signedIn={signedIn} />
    </NextIntlClientProvider>,
  );
}

describe("QuickDisplayPopover", () => {
  it("is closed by default, with a Display-labelled trigger", () => {
    show();
    const trigger = screen.getByRole("button", { name: "Display" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("opens to show theme, presets, text size and a link to the full settings page", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Display" }));

    expect(screen.getByRole("radio", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bayanihan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Equity in Health" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Large" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /More display settings/ })).toHaveAttribute("href", "/settings#display");
  });

  it("applies a theme change immediately and closes when the settings link is followed", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Display" }));
    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await user.click(screen.getByRole("link", { name: /More display settings/ }));
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("signed in: saves through rpc_update_display_settings after the debounce", async () => {
    vi.useFakeTimers();
    show(true);
    fireEvent.click(screen.getByRole("button", { name: "Display" }));
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));

    await vi.advanceTimersByTimeAsync(600);

    expect(state.rpcCalls).toEqual([{ name: "rpc_update_display_settings", args: { p_settings: { theme: "dark" } } }]);
    expect(document.cookie).not.toContain("BHW_DISPLAY=");
  });

  it("signed out: writes the BHW_DISPLAY cookie instead of calling the RPC", async () => {
    vi.useFakeTimers();
    show(false);
    fireEvent.click(screen.getByRole("button", { name: "Display" }));
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));

    await vi.advanceTimersByTimeAsync(600);

    expect(state.rpcCalls).toEqual([]);
    expect(document.cookie).toContain("BHW_DISPLAY=");
    expect(decodeURIComponent(document.cookie)).toContain('"theme":"dark"');
  });

  it("selecting a preset sets both the main and accent colour", async () => {
    vi.useFakeTimers();
    show(true);
    fireEvent.click(screen.getByRole("button", { name: "Display" }));
    fireEvent.click(screen.getByRole("button", { name: "Equity in Health" }));

    await vi.advanceTimersByTimeAsync(600);

    expect(state.rpcCalls).toEqual([
      { name: "rpc_update_display_settings", args: { p_settings: { primary_color: "equity", accent_color: "marigold" } } },
    ]);
  });
});

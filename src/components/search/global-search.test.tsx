import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import fil from "../../../messages/fil.json";
import { GlobalSearch } from "./global-search";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  push.mockClear();
});

describe("GlobalSearch", () => {
  it.each(["en", "fil"] as const)("closes with a labeled control or Escape and restores focus (%s)", async (locale) => {
    const messages = locale === "en" ? en : fil;
    const user = userEvent.setup();
    render(<NextIntlClientProvider locale={locale} messages={messages}><GlobalSearch /></NextIntlClientProvider>);
    const trigger = screen.getByRole("button", { name: messages.search.triggerLabel });
    await user.click(trigger);
    expect(screen.getByRole("combobox")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: messages.search.closeLabel }));
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("dismisses search when another header control is used", async () => {
    const user = userEvent.setup();
    render(<NextIntlClientProvider locale="en" messages={en}><GlobalSearch /><button>Another control</button></NextIntlClientProvider>);
    await user.click(screen.getByRole("button", { name: en.search.triggerLabel }));
    await user.click(screen.getByRole("button", { name: "Another control" }));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Another control" })).toHaveFocus();
  });

  it("shows fresh suggestions and navigates to the selected result", async () => {
    const fetchSearch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{
        id: "entry-one", kind: "knowledge", title: "Vaccination schedule", excerpt: "",
        href: "/kb/immunization#entry-one",
      }] }),
    });
    vi.stubGlobal("fetch", fetchSearch);
    const user = userEvent.setup();
    render(<NextIntlClientProvider locale="en" messages={en}><GlobalSearch /></NextIntlClientProvider>);

    await user.click(screen.getByRole("button", { name: "Open global search" }));
    await user.type(screen.getByRole("combobox"), "vaccination");
    const result = await screen.findByRole("link", { name: /Vaccination schedule/ });
    expect(result).toHaveAttribute("href", "/kb/immunization#entry-one");
    expect(fetchSearch).toHaveBeenCalledWith(expect.stringContaining("q=vaccination"), expect.objectContaining({ cache: "no-store" }));

    await user.keyboard("{ArrowDown}{Enter}");
    expect(push).toHaveBeenCalledWith("/kb/immunization#entry-one");
    await waitFor(() => expect(screen.getByRole("button", { name: "Open global search" })).toHaveAttribute("aria-expanded", "false"));
  });
});

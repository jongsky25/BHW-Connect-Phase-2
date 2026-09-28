import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { GlobalSearch } from "./global-search";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  push.mockClear();
});

describe("GlobalSearch", () => {
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

    await user.click(screen.getByRole("button", { name: /Search/ }));
    await user.type(screen.getByRole("combobox"), "vaccination");
    const result = await screen.findByRole("link", { name: /Vaccination schedule/ });
    expect(result).toHaveAttribute("href", "/kb/immunization#entry-one");
    expect(fetchSearch).toHaveBeenCalledWith(expect.stringContaining("q=vaccination"), expect.objectContaining({ cache: "no-store" }));

    await user.keyboard("{ArrowDown}{Enter}");
    expect(push).toHaveBeenCalledWith("/kb/immunization#entry-one");
    await waitFor(() => expect(screen.getByRole("button", { name: /Search/ })).toHaveAttribute("aria-expanded", "false"));
  });
});

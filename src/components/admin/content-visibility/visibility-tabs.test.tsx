import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import enMessages from "../../../../messages/en.json";
import { VisibilityTabs } from "./visibility-tabs";

afterEach(cleanup);

describe("VisibilityTabs", () => {
  it("marks Active current on the base path and links Archived with ?view=archived", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VisibilityTabs basePath="/admin/kb/entries" view="active" activeCount={3} archivedCount={1} />
      </NextIntlClientProvider>,
    );

    const active = screen.getByRole("link", { name: /Active/ });
    const archived = screen.getByRole("link", { name: /Archived/ });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveAttribute("href", "/admin/kb/entries");
    expect(archived).not.toHaveAttribute("aria-current");
    expect(archived).toHaveAttribute("href", "/admin/kb/entries?view=archived");
    expect(screen.getByText(/Active \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/Archived \(1\)/)).toBeInTheDocument();
  });

  it("marks Archived current when view is archived", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <VisibilityTabs basePath="/admin/kb/entries" view="archived" activeCount={3} archivedCount={1} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("link", { name: /Archived/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Active/ })).not.toHaveAttribute("aria-current");
  });
});

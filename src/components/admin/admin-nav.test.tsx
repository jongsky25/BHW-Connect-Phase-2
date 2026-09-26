import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminNav } from "./admin-nav";

const state = vi.hoisted(() => ({ pathname: "/admin/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));

const groups = [
  {
    id: "overview",
    label: "Overview",
    items: [{ key: "dashboard", href: "/admin/dashboard", label: "Dashboard" }],
  },
  {
    id: "people",
    label: "People",
    items: [
      { key: "users", href: "/admin/users", label: "Users" },
      { key: "audit", href: "/admin/audit", label: "Audit log" },
    ],
  },
];
const preferencesItem = { key: "myPreferences", href: "/settings", label: "My preferences" };

describe("AdminNav", () => {
  it("marks the current page with aria-current and highlights it", () => {
    state.pathname = "/admin/users";
    render(<AdminNav groups={groups} preferencesItem={preferencesItem} menuLabel="Admin menu" />);

    const currentLinks = screen.getAllByRole("link", { name: "Users" });
    for (const link of currentLinks) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    const otherLinks = screen.getAllByRole("link", { name: "Dashboard" });
    for (const link of otherLinks) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("treats a nested path as active for its parent item", () => {
    state.pathname = "/admin/users?q=rosa";
    // Query strings never reach usePathname in the real router, but this
    // guards against the matcher being sensitive to trailing content.
    state.pathname = "/admin/users";
    render(<AdminNav groups={groups} preferencesItem={preferencesItem} menuLabel="Admin menu" />);
    expect(screen.getAllByRole("link", { name: "Users" })[0]).toHaveAttribute("aria-current", "page");
  });

  it("shows the current page's label next to the mobile menu button", () => {
    state.pathname = "/admin/audit";
    render(<AdminNav groups={groups} preferencesItem={preferencesItem} menuLabel="Admin menu" />);
    expect(screen.getByText("Admin menu")).toBeInTheDocument();
    expect(screen.getAllByText(/Audit log/).length).toBeGreaterThan(0);
  });

  it("renders the preferences item separately from the grouped items", () => {
    state.pathname = "/settings";
    render(<AdminNav groups={groups} preferencesItem={preferencesItem} menuLabel="Admin menu" />);
    const links = screen.getAllByRole("link", { name: "My preferences" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
  });
});

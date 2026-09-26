import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardTabs } from "./dashboard-tabs";

const state = vi.hoisted(() => ({ pathname: "/admin/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));

const tabs = [
  { key: "activity", href: "/admin/dashboard", label: "Activity" },
  { key: "chat-guide", href: "/admin/dashboard/chat-guide", label: "Chat guide" },
  { key: "reports", href: "/admin/dashboard/reports", label: "Reports" },
];

describe("DashboardTabs", () => {
  it("marks only the tab matching the current path as active", () => {
    state.pathname = "/admin/dashboard/chat-guide";
    render(<DashboardTabs tabs={tabs} />);

    expect(screen.getByRole("link", { name: "Chat guide" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Activity" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Reports" })).not.toHaveAttribute("aria-current");
  });

  it("does not treat the Activity tab as a prefix match for its sibling tabs", () => {
    state.pathname = "/admin/dashboard/reports";
    render(<DashboardTabs tabs={tabs} />);

    expect(screen.getByRole("link", { name: "Activity" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("aria-current", "page");
  });

  it("omits a tab that isn't passed in, e.g. Reports when reports_export is off", () => {
    state.pathname = "/admin/dashboard";
    render(<DashboardTabs tabs={tabs.slice(0, 2)} />);
    expect(screen.queryByRole("link", { name: "Reports" })).not.toBeInTheDocument();
  });
});

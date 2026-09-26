import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import type { FeatureFlags } from "@/lib/flags/types";
import { getNavItems } from "@/lib/nav/nav-items";
import type { AppUser } from "@/lib/supabase/app-user";
import { MobileDrawer } from "./mobile-drawer";

vi.mock("@/components/language-toggle", () => ({ LanguageToggle: () => <span>Language toggle</span> }));

const state = vi.hoisted(() => ({ pathname: "/home", pending: false, signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("@/lib/nav/use-sign-out", () => ({
  useSignOut: () => ({ signOut: state.signOut, pending: state.pending }),
}));

beforeEach(() => {
  state.pathname = "/home";
  state.pending = false;
  state.signOut.mockReset();
});
afterEach(cleanup);

const FLAGS: FeatureFlags = {
  kb_articles: true,
  reports_export: true,
  announcements: true,
  surveys: false,
  elearning: true,
  course_sessions: false,
  forum: false,
  flipcharts: false,
  offline_pwa: false,
  notifications: false,
  chat_conversation: false,
  ai_external: false,
  ai_gap_draft: false,
};

function show(role: AppUser["role"] = "bhw") {
  const items = getNavItems({ role, flags: FLAGS });
  const labels = Object.fromEntries(items.map((item) => [item.id, en.authHome[item.labelKey as keyof typeof en.authHome]]));
  // A fresh element each time: re-rendering the same element object lets
  // React bail out, so a changed usePathname() would never be re-read.
  const view = () => (
    <NextIntlClientProvider locale="en" messages={en}>
      <MobileDrawer account={{ username: "rosa.bhw", role }} items={items} labels={labels} />
    </NextIntlClientProvider>
  );
  const result = render(view());
  return { ...result, rerenderSame: () => result.rerender(view()) };
}

const dialog = () => document.querySelector("dialog") as HTMLDialogElement;

describe("MobileDrawer", () => {
  it("starts closed, behind a labelled menu button", () => {
    show();
    const trigger = screen.getByRole("button", { name: "Open menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(dialog()).not.toHaveAttribute("open");
    expect(dialog()).toHaveAttribute("aria-label", "Main menu");
  });

  it("opens with the account, the nav links, settings, display, language, privacy and sign out, in that order", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(dialog()).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "true");

    const d = within(dialog());
    expect(d.getByText("rosa.bhw")).toBeInTheDocument();
    expect(d.getByText("BHW")).toBeInTheDocument();

    const names = d.getAllByRole("link").map((link) => link.textContent);
    expect(names).toEqual([
      "Chat Guide",
      "Browse Knowledge Base",
      "Courses",
      "Announcements",
      "Settings",
      "Display",
      "Privacy Notice",
    ]);
    expect(d.getByText("Language toggle")).toBeInTheDocument();
    expect(d.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("lists Settings once, not also among the More links", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(within(dialog()).getAllByRole("link", { name: "Settings" })).toHaveLength(1);
  });

  it("shows the admin console link only for an admin", async () => {
    const user = userEvent.setup();
    show("admin");
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(within(dialog()).getByRole("link", { name: "Admin console" })).toHaveAttribute("href", "/admin/dashboard");
    cleanup();

    show("bhw");
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(within(dialog()).queryByRole("link", { name: "Admin console" })).not.toBeInTheDocument();
  });

  it("marks the current page with aria-current, including sub-routes", async () => {
    state.pathname = "/kb/some-article";
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const d = within(dialog());
    expect(d.getByRole("link", { name: "Browse Knowledge Base" })).toHaveAttribute("aria-current", "page");
    expect(d.getByRole("link", { name: "Chat Guide" })).not.toHaveAttribute("aria-current");
  });

  it("closes from the close button", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.click(within(dialog()).getByRole("button", { name: "Close menu" }));
    expect(dialog()).not.toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when a link is followed", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.click(within(dialog()).getByRole("link", { name: "Chat Guide" }));
    expect(dialog()).not.toHaveAttribute("open");
  });

  it("closes when the route changes while it is open", async () => {
    const user = userEvent.setup();
    const { rerenderSame } = show();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    state.pathname = "/chat";
    rerenderSame();
    expect(dialog()).not.toHaveAttribute("open");
  });

  it("signs out through the shared hook, and disables the button while pending", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.click(within(dialog()).getByRole("button", { name: "Sign out" }));
    expect(state.signOut).toHaveBeenCalledTimes(1);
    cleanup();

    state.pending = true;
    show();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(within(dialog()).getByRole("button", { name: "Sign out" })).toBeDisabled();
  });
});

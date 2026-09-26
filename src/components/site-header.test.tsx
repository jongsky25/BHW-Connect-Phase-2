import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import fil from "../../messages/fil.json";
import type { FeatureFlags } from "@/lib/flags/types";
import { SiteHeader } from "./site-header";

vi.mock("@/components/language-toggle", () => ({ LanguageToggle: () => <span>Language toggle</span> }));
vi.mock("@/components/notifications/notification-bell", () => ({ NotificationBell: () => <span>Notifications</span> }));
// UserMenu gets its own dedicated test (user-menu.test.tsx); here we only
// need to see which account it was composed with.
vi.mock("@/components/nav/user-menu", () => ({
  UserMenu: ({ account }: { account: { username: string; role: string } }) => (
    <span>UserMenu:{account.username}:{account.role}</span>
  ),
}));

let pathname = "/home";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

afterEach(() => {
  cleanup();
  pathname = "/home";
});

const ALL_FLAGS_OFF: FeatureFlags = {
  kb_articles: true,
  reports_export: true,
  announcements: false,
  surveys: false,
  elearning: false,
  course_sessions: false,
  forum: false,
  flipcharts: false,
  offline_pwa: false,
  notifications: false,
  chat_conversation: false,
  ai_external: false,
  ai_gap_draft: false,
};

const ALL_FLAGS_ON: FeatureFlags = {
  ...ALL_FLAGS_OFF,
  announcements: true,
  surveys: true,
  elearning: true,
  course_sessions: true,
  forum: true,
  flipcharts: true,
};

function show(
  locale: "en" | "fil",
  account: { username: string; role: "bhw" | "admin" | "assessor" | "designer" } | null,
  flags: FeatureFlags = ALL_FLAGS_OFF,
) {
  render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : fil}>
      <SiteHeader
        signedIn={!!account}
        account={account}
        notificationsEnabled={false}
        notifUnreadCount={0}
        flags={flags}
      />
    </NextIntlClientProvider>,
  );
}

describe("SiteHeader account indicator", () => {
  it("renders the user menu with the signed-in account, not the language toggle", () => {
    show("en", { username: "rosa.bhw", role: "bhw" });
    expect(screen.getByText("UserMenu:rosa.bhw:bhw")).toBeInTheDocument();
    expect(screen.queryByText("Language toggle")).not.toBeInTheDocument();
  });

  it("passes the assessor's account through unchanged", () => {
    show("fil", { username: "lito.assessor", role: "assessor" });
    expect(screen.getByText("UserMenu:lito.assessor:assessor")).toBeInTheDocument();
  });

  it("renders the language toggle instead of a user menu on signed-out pages", () => {
    show("en", null);
    expect(screen.getByText("Language toggle")).toBeInTheDocument();
    expect(screen.queryByText(/^UserMenu:/)).not.toBeInTheDocument();
  });
});

describe("SiteHeader navigation", () => {
  it("shows no nav links when signed out, even if flags are on", () => {
    show("en", null, ALL_FLAGS_ON);
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });

  it("shows a bhw's always-on links but not flag-gated or role-gated ones", async () => {
    const user = userEvent.setup();
    show("en", { username: "rosa.bhw", role: "bhw" }, ALL_FLAGS_OFF);
    expect(screen.getByRole("link", { name: "Chat Guide" })).toBeInTheDocument();

    // Settings is always-on, so the More menu itself is always present; only
    // the flag-gated items inside it should be missing.
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Announcements" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin console" })).not.toBeInTheDocument();
  });

  it("puts flag-gated links behind the More menu, closed by default", () => {
    show("en", { username: "rosa.bhw", role: "bhw" }, ALL_FLAGS_ON);
    expect(screen.getByRole("link", { name: "Courses" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Announcements" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the More menu on click and closes it on Escape, returning focus to the trigger", async () => {
    const user = userEvent.setup();
    show("en", { username: "rosa.bhw", role: "bhw" }, ALL_FLAGS_ON);

    const trigger = screen.getByRole("button", { name: "More" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Announcements" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("marks the current page with aria-current, including prefix matches", () => {
    pathname = "/kb/some-article";
    show("en", { username: "rosa.bhw", role: "bhw" });
    expect(screen.getByRole("link", { name: "Browse Knowledge Base" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Chat Guide" })).not.toHaveAttribute("aria-current");
  });

  it("shows the admin console link only for an admin", async () => {
    const user = userEvent.setup();
    show("en", { username: "priya.admin", role: "admin" }, ALL_FLAGS_OFF);
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("link", { name: "Admin console" })).toBeInTheDocument();
  });
});

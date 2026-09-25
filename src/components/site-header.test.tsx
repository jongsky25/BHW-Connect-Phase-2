import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import fil from "../../messages/fil.json";
import { SiteHeader } from "./site-header";

vi.mock("@/components/language-toggle", () => ({ LanguageToggle: () => <span>Language toggle</span> }));
vi.mock("@/components/notifications/notification-bell", () => ({ NotificationBell: () => <span>Notifications</span> }));

function show(locale: "en" | "fil", account: { username: string; role: "bhw" | "admin" | "assessor" | "designer" } | null) {
  render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : fil}>
      <SiteHeader signedIn={!!account} account={account} notificationsEnabled={false} notifUnreadCount={0} />
    </NextIntlClientProvider>,
  );
}

describe("SiteHeader account indicator", () => {
  it("shows the active username and role", () => {
    show("en", { username: "rosa.bhw", role: "bhw" });
    expect(screen.getByText("rosa.bhw")).toBeInTheDocument();
    expect(screen.getByText("BHW")).toBeInTheDocument();
    expect(screen.getByLabelText("Signed in as rosa.bhw, role: BHW")).toBeInTheDocument();
  });

  it("uses the Filipino label for an assessor", () => {
    show("fil", { username: "lito.assessor", role: "assessor" });
    expect(screen.getByLabelText("Naka-login bilang lito.assessor, tungkulin: Facilitator / Assessor")).toBeInTheDocument();
  });

  it("hides account details on signed-out pages", () => {
    show("en", null);
    expect(screen.queryByText("BHW")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Signed in as/)).not.toBeInTheDocument();
  });
});

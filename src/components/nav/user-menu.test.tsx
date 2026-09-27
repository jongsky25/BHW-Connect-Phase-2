import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import fil from "../../../messages/fil.json";
import { UserMenu } from "./user-menu";

vi.mock("@/components/language-toggle", () => ({ LanguageToggle: () => <span>Language toggle</span> }));

const signOut = vi.fn();
const state = vi.hoisted(() => ({ pending: false, startPreview: vi.fn(), assign: vi.fn() }));
vi.mock("@/lib/nav/use-sign-out", () => ({
  useSignOut: () => ({ signOut: signOut, pending: state.pending }),
}));
vi.mock("@/app/actions/preview", () => ({ startPreview: state.startPreview }));

beforeEach(() => {
  signOut.mockReset();
  state.pending = false;
  state.startPreview.mockReset().mockResolvedValue({ ok: true });
  state.assign.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign: state.assign },
  });
});
afterEach(cleanup);

function show(locale: "en" | "fil" = "en", role: "bhw" | "admin" = "bhw") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : fil}>
      <UserMenu account={{ username: role === "admin" ? "rcventura" : "rosa.bhw", role }} />
    </NextIntlClientProvider>,
  );
}

describe("UserMenu", () => {
  it("has the signed-in-as string as its accessible name, closed by default", () => {
    show();
    const trigger = screen.getByRole("button", { name: "Signed in as rosa.bhw, role: BHW" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("opens on click and shows the account, Settings, Display, Privacy Notice and Sign out", async () => {
    const user = userEvent.setup();
    show();

    await user.click(screen.getByRole("button", { name: "Signed in as rosa.bhw, role: BHW" }));

    expect(screen.getByText("rosa.bhw")).toBeInTheDocument();
    expect(screen.getByText("BHW")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: "Display" })).toHaveAttribute("href", "/settings#display");
    expect(screen.getByRole("link", { name: "Privacy Notice" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByText("Language toggle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    show();

    const trigger = screen.getByRole("button", { name: "Signed in as rosa.bhw, role: BHW" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes when a panel link is clicked", async () => {
    const user = userEvent.setup();
    show();

    await user.click(screen.getByRole("button", { name: "Signed in as rosa.bhw, role: BHW" }));
    await user.click(screen.getByRole("link", { name: "Settings" }));

    expect(screen.getByRole("button", { name: "Signed in as rosa.bhw, role: BHW" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("calls the shared sign-out hook when Sign out is clicked", async () => {
    const user = userEvent.setup();
    show();

    await user.click(screen.getByRole("button", { name: "Signed in as rosa.bhw, role: BHW" }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("disables Sign out while a sign-out is already pending", async () => {
    state.pending = true;
    const user = userEvent.setup();
    show();

    await user.click(screen.getByRole("button", { name: "Signed in as rosa.bhw, role: BHW" }));
    expect(screen.getByRole("button", { name: "Sign out" })).toBeDisabled();
  });

  it("uses the Filipino sign-in label as the accessible name", () => {
    show("fil");
    expect(screen.getByRole("button", { name: "Naka-login bilang rosa.bhw, tungkulin: BHW" })).toBeInTheDocument();
  });

  it("never shows View as for a non-admin account", async () => {
    const user = userEvent.setup();
    show("en", "bhw");
    await user.click(screen.getByRole("button", { name: "Signed in as rosa.bhw, role: BHW" }));
    expect(screen.queryByText("View as")).not.toBeInTheDocument();
  });

  it("shows a View as control listing BHW, Facilitator/Assessor and Designer for an admin account", async () => {
    const user = userEvent.setup();
    show("en", "admin");
    await user.click(screen.getByRole("button", { name: "Signed in as rcventura, role: Admin" }));

    expect(screen.getByText("View as")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "BHW" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Facilitator / Assessor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Designer" })).toBeInTheDocument();
  });

  it("starts a preview and navigates to /home on success", async () => {
    const user = userEvent.setup();
    show("en", "admin");
    await user.click(screen.getByRole("button", { name: "Signed in as rcventura, role: Admin" }));
    await user.click(screen.getByRole("button", { name: "BHW" }));

    expect(state.startPreview).toHaveBeenCalledWith("bhw");
    await waitFor(() => expect(state.assign).toHaveBeenCalledWith("/home"));
  });
});

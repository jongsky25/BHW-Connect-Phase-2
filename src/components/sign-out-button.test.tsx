import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "../../messages/en.json";
import { SignOutButton } from "./sign-out-button";

const state = vi.hoisted(() => ({ calls: [] as string[], push: vi.fn(), refresh: vi.fn(), clearFails: false }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push, refresh: state.refresh }) }));
vi.mock("@/app/actions/super-admin", () => ({
  clearSuperAdminCookies: async () => {
    state.calls.push("clearSuperAdminCookies");
    if (state.clearFails) throw new Error("An unexpected response was received from the server.");
  },
}));
vi.mock("@/lib/pwa/clear-offline-cache", () => ({ clearOfflineCache: async () => void state.calls.push("clearOfflineCache") }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut: async () => void state.calls.push("signOut") } }) }));

beforeEach(() => {
  state.calls = [];
  state.clearFails = false;
  state.push.mockReset();
  state.refresh.mockReset();
});
afterEach(cleanup);

const renderButton = () =>
  render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <SignOutButton />
    </NextIntlClientProvider>,
  );

describe("SignOutButton", () => {
  it("clears super admin cookies while still signed in, then signs out and goes to /login", async () => {
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(state.push).toHaveBeenCalledWith("/login"));
    expect(state.calls).toEqual(["clearSuperAdminCookies", "signOut", "clearOfflineCache"]);
    expect(state.refresh).toHaveBeenCalled();
  });

  it("still signs out and navigates when clearing the cookies fails", async () => {
    state.clearFails = true;
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(state.push).toHaveBeenCalledWith("/login"));
    expect(state.calls).toEqual(["clearSuperAdminCookies", "signOut", "clearOfflineCache"]);
  });

  it("never double-submits from a second click while sign-out is in flight", async () => {
    renderButton();
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(state.push).toHaveBeenCalledWith("/login"));
    expect(state.calls).toEqual(["clearSuperAdminCookies", "signOut", "clearOfflineCache"]);
  });
});

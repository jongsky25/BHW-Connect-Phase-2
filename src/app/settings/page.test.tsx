import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SettingsPage from "./page";
const state = vi.hoisted(() => ({ preview: false, authed: true, rpc: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(url); } }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: async () => ({ isPreview: state.preview }) }));
vi.mock("@/lib/supabase/request", () => ({ getRequestAuthUser: async () => ({ data: { user: state.authed ? { id: "self" } : null } }), getRequestAppUser: async () => ({ language: "en", a11y_settings: {} }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: state.rpc }) }));
vi.mock("@/components/settings/settings-form", () => ({ SettingsForm: () => <div>Existing settings</div> }));
vi.mock("@/components/settings/preferred-name-form", () => ({ PreferredNameForm: ({ initialName, loadFailed }: { initialName: string | null; loadFailed: boolean }) => <div data-testid="greeting-form" data-failed={String(loadFailed)}>{initialName}</div> }));
beforeEach(() => { state.preview = false; state.authed = true; state.rpc.mockReset().mockResolvedValue({ data: "RJ", error: null }); });
afterEach(cleanup);
it("loads the signed-in account preference separately from existing settings", async () => {
  render(await SettingsPage()); expect(screen.getByTestId("greeting-form")).toHaveTextContent("RJ");
  expect(state.rpc).toHaveBeenCalledWith("rpc_my_greeting_name"); expect(screen.getByText("Existing settings")).toBeInTheDocument();
});
it("does not fetch or expose a personal preference during preview", async () => {
  state.preview = true; render(await SettingsPage()); expect(state.rpc).not.toHaveBeenCalled(); expect(screen.queryByTestId("greeting-form")).not.toBeInTheDocument();
});
it("marks a failed read instead of presenting an editable empty preference", async () => {
  state.rpc.mockResolvedValue({ data: null, error: { message: "Unavailable" } }); render(await SettingsPage());
  expect(screen.getByTestId("greeting-form")).toHaveAttribute("data-failed", "true");
});
it("redirects signed-out visitors before querying a preference", async () => {
  state.authed = false; await expect(SettingsPage()).rejects.toThrow("/login"); expect(state.rpc).not.toHaveBeenCalled();
});

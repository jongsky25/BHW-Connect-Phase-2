import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MyResultsPage from "./page";
const state = vi.hoisted(() => ({ user: true, role: "assessor", preview: false, active: true, learning: true, rpc: vi.fn() }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: async () => ({ appUser: state.user ? { id: "self", status: state.active ? "active" : "deactivated" } : null, role: state.role, isPreview: state.preview }) }));
vi.mock("@/lib/supabase/request", () => ({ getRequestFeatureFlags: async () => ({ elearning: state.learning }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: state.rpc }) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT ${path}`); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/preview/preview-note", () => ({ PreviewNote: () => <p>Preview mode</p> }));
beforeEach(() => { Object.assign(state, { user: true, role: "assessor", preview: false, active: true, learning: true }); state.rpc.mockReset().mockResolvedValue({ data: { items: [], has_more: false }, error: null }); });
afterEach(cleanup);
const page = (value?: string) => MyResultsPage({ searchParams: Promise.resolve(value === undefined ? {} : { page: value }) });
it.each(["bhw", "assessor"])("loads only personal results for %s with bounded pagination", async role => {
  state.role = role; render(await page("2"));
  expect(state.rpc).toHaveBeenCalledExactlyOnceWith("rpc_my_test_history", { p_limit: 20, p_offset: 20 });
  expect(screen.getByRole("heading", { name: "My test results" })).toBeInTheDocument();
});
it("protects auth, flags, role and preview and rejects invalid pagination", async () => {
  state.user = false; await expect(page()).rejects.toThrow("REDIRECT /login");
  state.user = true; state.learning = false; await expect(page()).rejects.toThrow("REDIRECT /home");
  state.learning = true; state.role = "admin"; await expect(page()).rejects.toThrow("REDIRECT /home");
  state.role = "assessor"; await expect(page("-1")).rejects.toThrow("NOT_FOUND");
  state.preview = true; render(await page());
  expect(screen.getByText(/Return to your own account/)).toBeInTheDocument();
  expect(state.rpc).not.toHaveBeenCalled();
});
it("shows a recoverable error without replacing saved results with invented data", async () => {
  state.rpc.mockResolvedValue({ data: null, error: new Error("offline") });
  render(await page());
  expect(screen.getByRole("alert")).toHaveTextContent("Your saved scores are unchanged");
  expect(screen.getByRole("link", { name: "Reload results" })).toHaveAttribute("href", "/my-results");
});

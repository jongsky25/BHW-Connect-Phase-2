import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PlantAidsPage from "./page";

const state = vi.hoisted(() => ({ signedIn: true, preview: false, learning: true, feedback: true, locale: "en", rpc: vi.fn() }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: async () => ({ appUser: state.signedIn ? { id: "self" } : null, isPreview: state.preview }) }));
vi.mock("@/lib/supabase/request", () => ({ getRequestFeatureFlags: async () => ({ elearning: state.learning, spot_feedback: state.feedback }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: state.rpc }) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => state.locale }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT ${path}`); } }));
beforeEach(() => {
  Object.assign(state, { signedIn: true, preview: false, learning: true, feedback: true, locale: "en" });
  state.rpc.mockReset().mockResolvedValue({ data: true });
});
afterEach(cleanup);

it("requires an authenticated learner and the existing learning flag", async () => {
  state.signedIn = false;
  await expect(PlantAidsPage()).rejects.toThrow("REDIRECT /login");
  state.signedIn = true; state.learning = false;
  await expect(PlantAidsPage()).rejects.toThrow("REDIRECT /home");
  expect(state.rpc).not.toHaveBeenCalled();
});

it("renders the live review cards with existing feedback eligibility", async () => {
  render(await PlantAidsPage());
  expect(screen.getAllByRole("article")).toHaveLength(10);
  expect(state.rpc).toHaveBeenCalledExactlyOnceWith("spot_feedback_access");
  expect(screen.getByText(/Use the page comment button/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "← Courses" })).toHaveAttribute("href", "/courses");
});

it("keeps feedback instructions accurate in preview and when access is denied", async () => {
  state.preview = true; state.locale = "fil";
  render(await PlantAidsPage());
  expect(state.rpc).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mga reference aid sa halaman");
  expect(screen.getByText(/Suriin ang salita, salin/)).toBeInTheDocument();
  cleanup(); state.preview = false; state.rpc.mockResolvedValue({ data: false });
  render(await PlantAidsPage());
  expect(screen.getByText(/Suriin ang salita, salin/)).toBeInTheDocument();
});

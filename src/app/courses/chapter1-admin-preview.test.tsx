import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Chapter1AdminPreview from "./[id]/assessment/preview/page";

const state = vi.hoisted(() => ({ role: "admin", effectiveRole: "bhw", preview: true }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  redirect: (path: string) => { throw new Error(`REDIRECT ${path}`); },
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: async () => ({
  appUser: { id: "admin-1", role: state.role, status: "active" },
  role: state.effectiveRole, isPreview: state.preview,
}) }));
vi.mock("@/lib/supabase/request", () => ({ getRequestFeatureFlags: async () => ({
  elearning: true, chapter1_assessment_v2: true,
}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: () => {
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({
    data: { program_id: "manual", chapter_key: "chapter-1" }, error: null,
  }) };
  return query;
} }) }));
vi.mock("@/components/elearning/chapter1-learning-notes", () => ({
  Chapter1LearningNotes: ({ readOnly }: { readOnly: boolean }) => <p>Notes read only: {String(readOnly)}</p>,
}));

const page = (phase?: string, part?: string) => Chapter1AdminPreview({
  params: Promise.resolve({ id: "course" }),
  searchParams: Promise.resolve({ phase, part }),
});

beforeEach(() => { state.role = "admin"; state.effectiveRole = "bhw"; state.preview = true; });

describe("Chapter 1 admin content preview", () => {
  it("shows approved pre-test content without learner state calls", async () => {
    render(await page("pretest"));
    expect(screen.getByRole("heading", { name: "Chapter 1 content preview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Section 1 of 3/ })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(10);
    expect(screen.getByRole("link", { name: "Learning notes" })).toHaveAttribute("href", "/courses/course/assessment/preview?phase=notes");
  });

  it("shows the approved stock and resource wording in read-only section three", async () => {
    render(await page("pretest", "3"));
    expect(screen.getByText(/What should the BHW do before deciding how many usable copies remain\?/)).toBeInTheDocument();
    expect(screen.getByText(/What should the BHW do before claiming improved resource use\?/)).toBeInTheDocument();
  });

  it("shows the approved communication choice in read-only section two", async () => {
    render(await page("pretest", "2"));
    expect(screen.getByText("Ask the resident, ‘What do you mean by “too late”?’ and listen to the answer.")).toBeInTheDocument();
  });

  it("shows learning notes in read-only mode", async () => {
    render(await page("notes"));
    expect(screen.getByText("Notes read only: true")).toBeInTheDocument();
  });

  it("refuses direct access outside admin BHW preview", async () => {
    state.preview = false;
    await expect(page("pretest")).rejects.toThrow("NOT_FOUND");
    state.preview = true; state.role = "bhw";
    await expect(page("pretest")).rejects.toThrow("NOT_FOUND");
  });
});

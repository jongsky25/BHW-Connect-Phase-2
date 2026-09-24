import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotesMarkdown } from "./notes-markdown";
import { FacilitatorRoster } from "./facilitator-roster";

const state = vi.hoisted(() => ({ rpc: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc: state.rpc }) }));

beforeEach(() => {
  state.rpc.mockReset();
  state.refresh.mockReset();
});
afterEach(cleanup);

describe("NotesMarkdown", () => {
  it("renders lists, tables and emphasis", () => {
    render(<NotesMarkdown markdown={"Say *this*.\n\n1. **First** step\n   continues here\n2. Second\n\n| Part | Time |\n|---|---|\n| Opening | 30 min |"} />);
    expect(screen.getByText("this", { selector: "em" })).toBeInTheDocument();
    expect(screen.getByText("First", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText(/continues here/)).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "30 min" })).toBeInTheDocument();
  });

  it("shows authored HTML as text, never markup", () => {
    const { container } = render(<NotesMarkdown markdown={'<img src=x onerror="alert(1)"> <script>alert(1)</script>'} />);
    expect(container.querySelector("img,script")).toBeNull();
    expect(container.textContent).toContain("<script>");
  });
});

describe("FacilitatorRoster", () => {
  const indicators = [{ objective_index: 0, observable: "Names the three roles", levels: { kaya_na: "Unprompted", kailangan_practice: "With prompts", hindi_pa: "Needs a demo" } }];
  const rows = [{ id: "b1", name: "Rosa Cruz", unit: "Barangay Uno", lessonsDone: 1, pretest: 60, posttest: null, certified: false }];

  it("records an observation through the RPC and refreshes", async () => {
    state.rpc.mockResolvedValue({ error: null });
    render(<FacilitatorRoster lang="en" moduleId="m1" rows={rows} indicators={indicators} observations={[]} lessonCount={2} />);
    expect(screen.getByText(/Ind\. 1: not observed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Record observation" }));
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Kailangan pa ng practice/ }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Needed one prompt" } });
    fireEvent.click(save);
    await waitFor(() => expect(state.refresh).toHaveBeenCalled());
    expect(state.rpc).toHaveBeenCalledWith("rpc_competency_observation_record", {
      p_bhw_user_id: "b1", p_module_id: "m1", p_objective_index: 0, p_level: "kailangan_practice", p_note: "Needed one prompt",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Observation recorded for Rosa Cruz.");
  });

  it("explains a rejected recording", async () => {
    state.rpc.mockResolvedValue({ error: { message: "not authorized" } });
    render(<FacilitatorRoster lang="fil" moduleId="m1" rows={rows} indicators={indicators} observations={[]} lessonCount={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Magtala ng obserbasyon" }));
    fireEvent.click(screen.getByRole("radio", { name: /Kaya na/ }));
    fireEvent.click(screen.getByRole("button", { name: "Itala" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wala kang pahintulot");
    expect(state.refresh).not.toHaveBeenCalled();
  });
});

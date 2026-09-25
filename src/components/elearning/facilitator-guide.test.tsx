import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotesMarkdown } from "./notes-markdown";
import { FacilitatorRoster } from "./facilitator-roster";
import { SubchapterFacilitatorGuide } from "./facilitator-guide";
import activityCards from "../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/activities.json";
import type { FacilitatorActivity } from "@/lib/elearning/activities";
import type { CourseModuleFacilitatorNotes } from "@/lib/elearning/types";

const state = vi.hoisted(() => ({ rpc: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc: state.rpc }) }));

beforeEach(() => {
  state.rpc.mockReset();
  state.refresh.mockReset();
});
afterEach(cleanup);

describe("SubchapterFacilitatorGuide", () => {
  const shared = {
    lang: "fil" as const,
    lessons: [],
    objectives: [],
    notes: null,
    roster: [],
    observations: [],
    moduleId: "module-1",
    rosterTruncated: false,
    href: "/training/program/chapter/module-1",
    slidesContent: <p>Mga slide ng aralin</p>,
  };

  it("shows one selected subpage and keeps BHW Slides inside the guide card", () => {
    render(<SubchapterFacilitatorGuide {...shared} view="slides" />);
    const slidesLink = screen.getByRole("link", { name: /BHW Slides/ });
    expect(slidesLink).toHaveAttribute("aria-current", "page");
    expect(slidesLink).toHaveAttribute("href", "/training/program/chapter/module-1?view=slides");
    expect(screen.getByText("Mga slide ng aralin")).toBeInTheDocument();
    expect(screen.queryByText("1. Ano ang natututuhan ng BHW dito")).not.toBeInTheDocument();
  });

  it("keeps authored activities available as their own guide view", () => {
    const notes = { activities: [activityCards[0]] } as unknown as CourseModuleFacilitatorNotes;
    render(<SubchapterFacilitatorGuide {...shared} notes={notes} view="activities" />);
    expect(screen.getByRole("link", { name: /Mga gawain/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Mga gawaing maaari mong gawin" })).toBeInTheDocument();
  });
});

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

  it("links a selected eligible activity to the observation RPC", async () => {
    state.rpc.mockResolvedValue({error:null});
    const card=activityCards[0] as FacilitatorActivity;
    render(<FacilitatorRoster lang="en" moduleId="m1" rows={rows} indicators={indicators} observations={[]} lessonCount={2} activities={[card,{...card,id:'unrelated',title:{en:'Unrelated',fil:'Iba'},objective_indices:[2]}]}/>);
    fireEvent.click(screen.getByRole('button',{name:'Record observation'}));
    expect(screen.queryByRole('option',{name:'Unrelated'})).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox',{name:'Activity observed (optional)'}),{target:{value:card.id}});
    fireEvent.click(screen.getByRole('radio',{name:/Kailangan pa ng practice/}));
    fireEvent.click(screen.getByRole('button',{name:'Save'}));
    await waitFor(()=>expect(state.rpc).toHaveBeenCalledWith('rpc_competency_observation_record_activity',expect.objectContaining({p_activity_id:card.id,p_activity_version:1,p_objective_index:0})));
  });

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

  it("lists follow-ups oldest first and BHWs ready to observe, and opens the right indicator", () => {
    const two = [...indicators, { objective_index: 1, observable: "Gives an example", levels: indicators[0].levels }];
    const people = [
      ...rows,
      { id: "b2", name: "Lito Reyes", unit: null, lessonsDone: 2, pretest: null, posttest: null, certified: false },
      { id: "b3", name: "Ana Santos", unit: null, lessonsDone: 2, pretest: null, posttest: null, certified: false },
    ];
    const obs = (id: string, bhw: string, index: number, level: "kaya_na" | "kailangan_practice" | "hindi_pa", at: string, note = "") =>
      ({ id, bhw_user_id: bhw, observer_user_id: "f", module_id: "m1", objective_index: index, level, note, observed_at: at });
    render(<FacilitatorRoster lang="en" moduleId="m1" rows={people} indicators={two} lessonCount={2} observations={[
      obs("o1", "b1", 0, "hindi_pa", "2026-09-10T00:00:00Z"),
      obs("o2", "b1", 0, "kaya_na", "2026-09-12T00:00:00Z"),
      obs("o3", "b1", 1, "kailangan_practice", "2026-09-11T00:00:00Z", "Needed a prompt"),
      obs("o4", "b2", 0, "hindi_pa", "2026-09-01T00:00:00Z"),
    ]} />);
    const panel = screen.getByRole("heading", { name: "Needs follow-up" }).parentElement!;
    const items = within(panel).getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatch(/^Lito Reyes · Ind\. 1: Hindi pa/);
    expect(items[1]).toMatch(/^Rosa Cruz · Ind\. 2: Kailangan pa ng practice.*Needed a prompt/);
    expect(within(panel).getByText(/not yet observed/).parentElement).toHaveTextContent("Ana Santos");
    fireEvent.click(within(panel).getAllByRole("button", { name: "Re-observe" })[1]);
    expect(screen.getByRole("combobox", {name:"Indicator"})).toHaveValue("1");
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

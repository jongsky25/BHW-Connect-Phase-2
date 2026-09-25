import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "../../../messages/en.json";
import { TrainingSessionDetail } from "./training-session-detail";
import type { CourseModule, CourseSession, CourseSessionEnrollment } from "@/lib/elearning/types";

const state = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc: state.rpc }) }));

const session = {
  id: "s1", course_id: "c1", org_unit_id: "o1", facilitator_user_id: "f1", scheduled_at: "2026-09-30T01:00:00Z",
  location_note: "", lesson_density: "normal", status: "scheduled", created_at: "2026-09-01T00:00:00Z",
  courses: { title_fil: "Kabanata I", title_en: "Chapter I" },
} as CourseSession;
const modules = [
  { id: "m1", course_id: "c1", position: 0, type: "text", title_en: "Roles", title_fil: "Tungkulin", objectives_en: [], objectives_fil: [], lesson: null },
  { id: "q1", course_id: "c1", position: 1, type: "quiz", title_en: "Quiz", title_fil: "Pagsusulit", objectives_en: [], objectives_fil: [], lesson: null },
] as unknown as CourseModule[];
const enrollments: CourseSessionEnrollment[] = [
  { id: "e1", session_id: "s1", bhw_user_id: "b1", status: "enrolled", enrolled_at: "2026-09-01T00:00:00Z", users: { full_name: "Rosa Cruz", username: "rosa" } },
];

function renderDetail(overrides: Partial<Parameters<typeof TrainingSessionDetail>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <TrainingSessionDetail session={session} modules={modules} visuals={[]} facilitatorNotes={[]} initialEnrollments={enrollments}
        initialDeliveries={[]} courseProgress={[]} moduleProgress={[]} testAttempts={[]} bhwCandidates={[]} locale="en" {...overrides} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => state.rpc.mockReset());
afterEach(cleanup);

describe("TrainingSessionDetail facilitation log", () => {
  it("marks attendance through the RPC", async () => {
    state.rpc.mockResolvedValue({ data: null, error: null });
    renderDetail();
    const select = screen.getByRole("combobox", { name: "Attendance: Rosa Cruz" });
    fireEvent.change(select, { target: { value: "attended" } });
    await waitFor(() => expect(select).toHaveValue("attended"));
    expect(state.rpc).toHaveBeenCalledWith("rpc_course_session_set_attendance", { p_session_id: "s1", p_bhw_user_id: "b1", p_status: "attended" });
  });

  it("logs a subchapter (never the quiz) and shows it in the log", async () => {
    state.rpc.mockResolvedValue({ data: "d1", error: null });
    renderDetail();
    const picker = screen.getByRole("combobox", { name: "Subchapter" });
    expect(within(picker).getAllByRole("option").map((o) => o.textContent)).toEqual(["Roles"]);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Minutes" }), { target: { value: "90" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Notes (optional)" }), { target: { value: "Ran the opening" } });
    fireEvent.click(screen.getByRole("button", { name: "Log subchapter" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Subchapter logged.");
    expect(state.rpc).toHaveBeenCalledWith("rpc_course_session_log_delivery", { p_session_id: "s1", p_module_id: "m1", p_duration_minutes: 90, p_notes: "Ran the opening" });
    expect(screen.getByText("Roles · 90 min")).toBeInTheDocument();
    expect(screen.getByText("Ran the opening")).toBeInTheDocument();
  });

  it("rejects an invalid duration before calling the RPC", () => {
    renderDetail();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Minutes" }), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Log subchapter" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter between 1 and 600 minutes.");
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("explains why a session cannot be closed yet, then closes it", async () => {
    state.rpc.mockResolvedValueOnce({ data: null, error: { message: "attendance incomplete" } });
    renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Mark session completed" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Mark every enrolled BHW as attended or absent");
    state.rpc.mockResolvedValueOnce({ data: null, error: null });
    fireEvent.click(screen.getByRole("button", { name: "Mark session completed" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Mark session completed" })).not.toBeInTheDocument());
    expect(screen.getByRole("combobox", { name: "Attendance: Rosa Cruz" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Log subchapter" })).not.toBeInTheDocument();
  });
});

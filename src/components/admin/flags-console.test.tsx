import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "../../../messages/en.json";
import type { FeatureFlagRow } from "@/lib/flags/types";
import { FlagsConsole } from "./flags-console";

const state = vi.hoisted(() => ({ rpc: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc: state.rpc }) }));

beforeEach(() => {
  state.rpc.mockReset();
  state.rpc.mockResolvedValue({ error: null });
  state.refresh.mockReset();
});
afterEach(cleanup);

// forum: per-type scope (bhw/assessor/designer), enabled, disabled for bhw.
// reports_export: master-only (empty FLAG_ROLE_SCOPE) — every role column is "—".
// course_sessions: per-type scope (bhw/assessor), but its master switch is
// off, so every in-scope role cell reads "Off for everyone" instead of a
// switch.
const flags: FeatureFlagRow[] = [
  {
    id: "forum-id",
    key: "forum",
    enabled: true,
    description: "Peer discussion boards.",
    disabled_roles: ["bhw"],
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "reports-id",
    key: "reports_export",
    enabled: true,
    description: "Reports dashboard and export routes.",
    disabled_roles: [],
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "sessions-id",
    key: "course_sessions",
    enabled: false,
    description: "Scheduled, facilitator-led training sessions.",
    disabled_roles: [],
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function renderConsole(canEdit: boolean) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <FlagsConsole initialFlags={flags} canEdit={canEdit} />
    </NextIntlClientProvider>,
  );
}

describe("FlagsConsole", () => {
  it("renders the matrix: one row per flag, a column per user type", () => {
    renderConsole(true);

    expect(screen.getAllByText("Forum").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reports & export").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Training sessions").length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "Available" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "BHW" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Assessor" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Designer" })).toBeInTheDocument();
  });

  it("shows — for a flag with no per-type switches (reports_export)", () => {
    renderConsole(true);
    const naCells = screen.getAllByLabelText("Not applicable");
    expect(naCells.length).toBeGreaterThan(0);
    for (const cell of naCells) {
      expect(cell).toHaveTextContent("—");
    }
    // None of reports_export's role columns render a switch.
    expect(
      screen.queryAllByRole("switch", { name: /Reports & export for (BHW|Assessor|Designer)/ }),
    ).toHaveLength(0);
  });

  it("disables the per-type cells and shows 'Off for everyone' while the master switch is off", () => {
    renderConsole(true);
    expect(screen.getAllByText("Off for everyone").length).toBeGreaterThan(0);
    expect(
      screen.queryAllByRole("switch", { name: /Training sessions for (BHW|Assessor)/ }),
    ).toHaveLength(0);
  });

  it("calls rpc_flag_set_role with the right arguments when a super admin flips a per-type switch", async () => {
    renderConsole(true);
    // forum is disabled for bhw, so this switch reads "Off" and clicking it
    // turns the feature back on for BHWs (p_enabled: true).
    const [bhwSwitch] = screen.getAllByRole("switch", { name: "Turn Forum on or off for BHW" });
    fireEvent.click(bhwSwitch);

    await waitFor(() =>
      expect(state.rpc).toHaveBeenCalledWith("rpc_flag_set_role", {
        p_key: "forum",
        p_role: "bhw",
        p_enabled: true,
      }),
    );
    await waitFor(() => expect(state.refresh).toHaveBeenCalled());
  });

  it("calls rpc_flag_toggle for the Available column", async () => {
    renderConsole(true);
    const [availableSwitch] = screen.getAllByRole("switch", { name: "Turn Forum on or off for everyone" });
    fireEvent.click(availableSwitch);

    await waitFor(() =>
      expect(state.rpc).toHaveBeenCalledWith("rpc_flag_toggle", { p_key: "forum", p_enabled: false }),
    );
  });

  it("renders every cell as status text, with no switches, when canEdit is false", () => {
    renderConsole(false);
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
    expect(screen.getByText("Only the super admin can change these.")).toBeInTheDocument();
    // The status is still visible, just not interactive.
    expect(screen.getAllByText("On").length).toBeGreaterThan(0);
  });
});

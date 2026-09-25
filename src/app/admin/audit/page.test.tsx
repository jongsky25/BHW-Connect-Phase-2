import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminAuditPage from "./page";

const state = vi.hoisted(() => ({ limit: vi.fn(), locale: "en" }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ order: () => ({ limit: state.limit }) }) }),
  }),
}));
vi.mock("next-intl/server", () => ({
  getLocale: async () => state.locale,
  getTranslations: async () => (key: string) => key,
}));

beforeEach(() => {
  state.limit.mockReset();
  state.locale = "en";
});
afterEach(cleanup);

describe("admin audit page", () => {
  it("propagates a database timeout instead of displaying an empty audit trail", async () => {
    const error = { code: "57014", message: "canceling statement due to statement timeout" };
    state.limit.mockResolvedValue({ data: null, error });
    await expect(AdminAuditPage()).rejects.toMatchObject({
      message: "Failed to load audit events",
      cause: error,
    });
  });

  it("shows the empty state only after a successful query with no events", async () => {
    state.limit.mockResolvedValue({ data: [], error: null });
    render(await AdminAuditPage());
    expect(screen.getByText("empty")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it.each(["en", "fil"])("renders saved audit summaries in %s", async (locale) => {
    state.locale = locale;
    state.limit.mockResolvedValue({
      data: [{ id: "event-1", event_type: "user.created", plain_summary_en: "User created",
        plain_summary_fil: "Nagdagdag ng user", created_at: "2026-09-25T02:00:00Z" }],
      error: null,
    });
    render(await AdminAuditPage());
    expect(screen.getByRole("listitem")).toHaveTextContent(locale === "en" ? "User created" : "Nagdagdag ng user");
    expect(screen.queryByText("empty")).not.toBeInTheDocument();
  });
});

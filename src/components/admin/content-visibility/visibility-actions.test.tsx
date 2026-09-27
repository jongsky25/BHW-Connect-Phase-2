import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "../../../../messages/en.json";
import { VisibilityActions } from "./visibility-actions";

const state = vi.hoisted(() => ({ rpc: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: state.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc: state.rpc }) }));

beforeEach(() => {
  state.rpc.mockReset();
  state.rpc.mockResolvedValue({ error: null });
  state.refresh.mockReset();
});
afterEach(cleanup);

function renderActions(props: Partial<Parameters<typeof VisibilityActions>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <VisibilityActions
        contentType="kb_entry"
        id="entry-1"
        hidden_at={null}
        archived_at={null}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("VisibilityActions", () => {
  it("opens the menu on click and shows Hide/Archive for a visible item", () => {
    renderActions();
    const trigger = screen.getByRole("button", { name: /Actions/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
  });

  it("shows Show and Archive for a hidden item, and Restore only for an archived one", () => {
    renderActions({ hidden_at: "2026-01-01T00:00:00Z" });
    fireEvent.click(screen.getByRole("button", { name: /Actions/ }));
    expect(screen.getByRole("button", { name: "Show" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();

    cleanup();
    renderActions({ archived_at: "2026-01-02T00:00:00Z" });
    fireEvent.click(screen.getByRole("button", { name: /Actions/ }));
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hide" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("closes the menu on Escape and returns focus to the trigger (keyboard)", () => {
    renderActions();
    const trigger = screen.getByRole("button", { name: /Actions/ });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("calls rpc_content_set_visibility directly for Hide (no confirmation)", async () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /Actions/ }));
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));

    await waitFor(() =>
      expect(state.rpc).toHaveBeenCalledWith("rpc_content_set_visibility", {
        p_type: "kb_entry",
        p_id: "entry-1",
        p_action: "hide",
      }),
    );
    await waitFor(() => expect(state.refresh).toHaveBeenCalled());
  });

  it("asks for confirmation before Archive, and only calls the RPC after confirming", async () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /Actions/ }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(state.rpc).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() =>
      expect(state.rpc).toHaveBeenCalledWith("rpc_content_set_visibility", {
        p_type: "kb_entry",
        p_id: "entry-1",
        p_action: "archive",
      }),
    );
  });

  it("cancelling the archive confirmation never calls the RPC", () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /Actions/ }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(state.rpc).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows a friendly error when the RPC fails, and does not refresh", async () => {
    state.rpc.mockResolvedValue({ error: { message: "content archived" } });
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /Actions/ }));
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));

    await waitFor(() =>
      expect(
        screen.getByText("This item is archived and can't be edited. Restore it first."),
      ).toBeInTheDocument(),
    );
    expect(state.refresh).not.toHaveBeenCalled();
  });
});

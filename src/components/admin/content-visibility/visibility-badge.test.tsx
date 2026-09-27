import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import enMessages from "../../../../messages/en.json";
import { VisibilityBadge } from "./visibility-badge";

afterEach(cleanup);

function renderBadge(hidden_at: string | null, archived_at: string | null) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <VisibilityBadge hidden_at={hidden_at} archived_at={archived_at} />
    </NextIntlClientProvider>,
  );
}

describe("VisibilityBadge", () => {
  it("renders nothing when neither hidden nor archived", () => {
    const { container } = renderBadge(null, null);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Hidden when only hidden_at is set", () => {
    renderBadge("2026-01-01T00:00:00Z", null);
    expect(screen.getByText("Hidden")).toBeInTheDocument();
  });

  it("shows Archived when archived_at is set, even if hidden_at is also set", () => {
    renderBadge("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z");
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });
});

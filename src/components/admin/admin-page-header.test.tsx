import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminPageHeader } from "./admin-page-header";

describe("AdminPageHeader", () => {
  it("renders the title as a heading", () => {
    render(<AdminPageHeader title="Users" />);
    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
  });

  it("renders the description when given", () => {
    render(<AdminPageHeader title="Feature flags" description="Turn features on or off." />);
    expect(screen.getByText("Turn features on or off.")).toBeInTheDocument();
  });

  it("omits the description when not given", () => {
    render(<AdminPageHeader title="Users" />);
    expect(screen.queryByText(/./, { selector: "p" })).not.toBeInTheDocument();
  });

  it("renders actions when given", () => {
    render(<AdminPageHeader title="Articles" actions={<button type="button">New article</button>} />);
    expect(screen.getByRole("button", { name: "New article" })).toBeInTheDocument();
  });
});

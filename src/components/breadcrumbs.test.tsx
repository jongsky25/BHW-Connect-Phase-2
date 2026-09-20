import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "./breadcrumbs";

describe("Breadcrumbs", () => {
  it("links every ancestor and marks the current page as non-interactive", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/home" },
          { label: "Courses", href: "/courses" },
          { label: "Ligtas na Panganganak" },
        ]}
      />,
    );

    const homeLink = screen.getByRole("link", { name: /Home/ });
    expect(homeLink).toHaveAttribute("href", "/home");

    const coursesLink = screen.getByRole("link", { name: /Courses/ });
    expect(coursesLink).toHaveAttribute("href", "/courses");

    const current = screen.getByText("Ligtas na Panganganak");
    expect(current.tagName).toBe("SPAN");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("prefixes the immediate parent with a back arrow", () => {
    render(<Breadcrumbs items={[{ label: "Home", href: "/home" }, { label: "Chat Guide" }]} />);

    expect(screen.getByRole("link", { name: "← Home" })).toBeInTheDocument();
  });

  it("renders a single-item trail as an unlinked current page", () => {
    render(<Breadcrumbs items={[{ label: "Home" }]} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Home")).toHaveAttribute("aria-current", "page");
  });

  it("exposes the trail under an accessible breadcrumb landmark", () => {
    render(<Breadcrumbs items={[{ label: "Home", href: "/home" }, { label: "Settings" }]} />);

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import enMessages from "../../messages/en.json";
import { LanguageToggle } from "./language-toggle";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function renderToggle() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <LanguageToggle />
    </NextIntlClientProvider>,
  );
}

describe("LanguageToggle", () => {
  it("renders both language options and marks the active one", () => {
    renderToggle();

    expect(screen.getByRole("button", { name: "Filipino" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("sets the locale cookie and refreshes when a language is picked", async () => {
    document.cookie = "";
    renderToggle();

    await userEvent.click(screen.getByRole("button", { name: "Filipino" }));

    expect(document.cookie).toContain("BHW_LOCALE=fil");
    expect(refresh).toHaveBeenCalled();
  });
});

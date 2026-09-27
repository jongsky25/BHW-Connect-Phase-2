import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fil from "../../../messages/fil.json";
import { EquityMark } from "./equity-mark";

afterEach(cleanup);

function show(locale: "en" | "fil", props: Parameters<typeof EquityMark>[0]) {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : fil}>
      <EquityMark {...props} />
    </NextIntlClientProvider>,
  );
}

describe("EquityMark", () => {
  it("has an accessible image name by default", () => {
    show("en", { size: "md" });
    expect(screen.getByRole("img", { name: "Equity in Health" })).toBeInTheDocument();
  });

  it("carries the same accessible name in Filipino (a proper name, not translated)", () => {
    show("fil", { size: "md" });
    expect(screen.getByRole("img", { name: "Equity in Health" })).toBeInTheDocument();
  });

  it("is hidden from assistive tech when decorative, with no img role", () => {
    show("en", { size: "sm", decorative: true });
    expect(screen.queryByRole("img", { name: "Equity in Health" })).not.toBeInTheDocument();
    const mark = document.querySelector(".equity-mark");
    expect(mark).toHaveAttribute("aria-hidden", "true");
  });

  it.each([
    ["sm", "h-[20px]"],
    ["md", "h-[32px]"],
    ["lg", "h-[48px]"],
  ] as const)("renders the %s size at a fixed pixel height, not a rem-based step", (size, expectedClass) => {
    show("en", { size });
    expect(screen.getByRole("img", { name: "Equity in Health" })).toHaveClass(expectedClass);
  });

  it("accepts an extra className alongside its own", () => {
    show("en", { size: "sm", className: "self-center" });
    expect(screen.getByRole("img", { name: "Equity in Health" })).toHaveClass("self-center");
  });
});

import { cleanup, render, screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach,beforeEach,describe, expect, it, vi } from "vitest";
import enMessages from "../../messages/en.json";
import { LanguageToggle } from "./language-toggle";

const refresh = vi.fn();
const save=vi.hoisted(()=>vi.fn());
vi.mock('@/app/actions/set-language',()=>({persistLanguage:save}));
afterEach(cleanup);
beforeEach(()=>{refresh.mockClear();save.mockReset();save.mockResolvedValue(true);document.cookie='BHW_LOCALE=; max-age=0; path=/';});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function renderToggle(signedIn=false) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <LanguageToggle signedIn={signedIn} />
    </NextIntlClientProvider>,
  );
}

describe("LanguageToggle", () => {
  it('persists signed-in language before refreshing',async()=>{
    renderToggle(true);await userEvent.click(screen.getByRole('button',{name:'Filipino'}));
    await waitFor(()=>expect(refresh).toHaveBeenCalled());expect(save).toHaveBeenCalledWith('fil');
    expect(document.cookie).toContain('BHW_LOCALE=fil');
  });
  it('shows a failed profile save instead of claiming a successful switch',async()=>{
    save.mockResolvedValue(false);renderToggle(true);await userEvent.click(screen.getByRole('button',{name:'Filipino'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Language could not be saved');expect(refresh).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('BHW_LOCALE=fil');
  });
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

  it("keeps the label for screen readers only on narrow screens when compact", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <LanguageToggle compact />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Language")).toHaveClass("sr-only", "sm:not-sr-only");
    cleanup();

    renderToggle();
    expect(screen.getByText("Language")).not.toHaveClass("sr-only");
  });

  it("sets the locale cookie and refreshes when a language is picked", async () => {
    document.cookie = "";
    renderToggle();

    await userEvent.click(screen.getByRole("button", { name: "Filipino" }));

    expect(document.cookie).toContain("BHW_LOCALE=fil");
    expect(refresh).toHaveBeenCalled();
  });
});

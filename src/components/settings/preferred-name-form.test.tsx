import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import fil from "../../../messages/fil.json";
import { PreferredNameForm } from "./preferred-name-form";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc: mocks.rpc }) }));
beforeEach(() => { mocks.rpc.mockReset().mockResolvedValue({ data: "RJ", error: null }); mocks.refresh.mockReset(); });
afterEach(cleanup);
function show(locale: "en" | "fil" = "en", initialName: string | null = null, loadFailed = false) {
  render(<NextIntlClientProvider locale={locale} messages={locale === "en" ? en : fil}><PreferredNameForm initialName={initialName} loadFailed={loadFailed} /></NextIntlClientProvider>);
}
it.each(["en", "fil"] as const)("saves an explicit greeting name and confirms only after success (%s)", async locale => {
  const user = userEvent.setup(), messages = locale === "en" ? en : fil; show(locale);
  await user.type(screen.getByLabelText(messages.greetingName.label), "  RJ  ");
  await user.click(screen.getByRole("button", { name: messages.greetingName.save }));
  expect(await screen.findByRole("status")).toHaveTextContent(messages.greetingName.saved);
  expect(mocks.rpc).toHaveBeenCalledWith("rpc_set_my_greeting_name", { p_preferred_name: "RJ" });
  expect(screen.getByLabelText(messages.greetingName.label)).toHaveValue("RJ");
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});
it("retains an unsaved entry after failure and supports retry", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "Network unavailable" } });
  const user = userEvent.setup(); show();
  await user.type(screen.getByLabelText(en.greetingName.label), "RJ");
  await user.click(screen.getByRole("button", { name: en.greetingName.save }));
  expect(await screen.findByRole("alert")).toHaveTextContent(en.greetingName.saveError);
  expect(screen.getByLabelText(en.greetingName.label)).toHaveValue("RJ");
  expect(screen.queryByRole("status")).not.toBeInTheDocument(); expect(mocks.refresh).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: en.greetingName.save }));
  expect(await screen.findByRole("status")).toHaveTextContent(en.greetingName.saved);
});
it("clears the preference explicitly with a blank saved value", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: null }); const user = userEvent.setup(); show("en", "Rosa");
  await user.clear(screen.getByLabelText(en.greetingName.label));
  await user.click(screen.getByRole("button", { name: en.greetingName.save }));
  expect(await screen.findByRole("status")).toBeInTheDocument();
  expect(mocks.rpc).toHaveBeenCalledWith("rpc_set_my_greeting_name", { p_preferred_name: null });
});
it("prevents overwriting an unloaded preference and offers reload", async () => {
  const user = userEvent.setup(); show("en", null, true);
  expect(screen.getByLabelText(en.greetingName.label)).toBeDisabled();
  expect(screen.getByRole("button", { name: en.greetingName.save })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: en.greetingName.reload }));
  expect(mocks.refresh).toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
});
it("rejects an oversized value before sending a write", async () => {
  show(); fireEvent.change(screen.getByLabelText(en.greetingName.label), { target: { value: "x".repeat(81) } });
  fireEvent.submit(screen.getByRole("button", { name: en.greetingName.save }).closest("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent(en.greetingName.invalid); expect(mocks.rpc).not.toHaveBeenCalled();
});

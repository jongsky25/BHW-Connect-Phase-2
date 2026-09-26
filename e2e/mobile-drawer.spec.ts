import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { STABLE_BHW } from "./fixtures/auth";

// Header increment 1.4: below `md`, the header's nav lives in a ☰ drawer (a
// native <dialog> opened with showModal()). A phone-sized viewport, where the
// desktop links are hidden and the drawer is the only way to navigate.
test.use({ viewport: { width: 390, height: 844 } });

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });
}

test("the mobile drawer opens, traps focus, closes on Escape, and has no axe violations", async ({ page }) => {
  await signIn(page);
  await page.goto("/settings");

  // At this width the desktop links are hidden (`hidden md:flex`) and the ☰
  // button is how a BHW reaches every page.
  const trigger = page.getByRole("button", { name: "Buksan ang menu" });
  await trigger.click();

  const drawer = page.getByRole("dialog", { name: "Pangunahing menu" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Mga Setting" })).toHaveAttribute("aria-current", "page");

  const scan = await new AxeBuilder({ page }).include("dialog").analyze();
  expect(scan.violations, "axe violations in the open drawer").toEqual([]);

  // The modal <dialog> makes the rest of the page inert: tabbing past the last
  // item must never land on page content behind the drawer.
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    const escaped = await page.evaluate(() => {
      const active = document.activeElement;
      const dialog = document.querySelector("dialog[open]");
      return !!active && active !== document.body && !dialog?.contains(active);
    });
    expect(escaped, `focus left the drawer after ${i + 1} Tab presses`).toBe(false);
  }

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("following a drawer link navigates and closes the drawer", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Buksan ang menu" }).click();

  const drawer = page.getByRole("dialog", { name: "Pangunahing menu" });
  await drawer.getByRole("link", { name: "Tingnan ang Knowledge Base" }).click();

  await expect(page).toHaveURL("/kb");
  await expect(drawer).toBeHidden();
});

test("signing out from the mobile drawer lands on /login", async ({ page }) => {
  await signIn(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Buksan ang menu" }).click();

  await page.getByRole("dialog", { name: "Pangunahing menu" }).getByRole("button", { name: "Mag-sign out" }).click();

  await expect(page).toHaveURL("/login", { timeout: 10_000 });
});

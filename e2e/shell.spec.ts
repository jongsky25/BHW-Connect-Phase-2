import { expect, test } from "@playwright/test";

// "/" now requires an authenticated session (INC-1), so the foundation-shell
// smoke checks run against /login instead — a route that's always public
// regardless of whether a Supabase project is configured.

test("login page renders the foundation shell in Filipino by default", async ({ page }) => {
  await page.goto("/login");

  await expect(page.locator("html")).toHaveAttribute("lang", "fil");
  await expect(page.getByRole("heading", { name: "Mag-log in sa BHW Connect" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Patakaran sa Privacy" })).toBeVisible();
});

test("language toggle switches the sample string to English", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "English" }).click();

  await expect(page.getByRole("heading", { name: "Log in to BHW Connect" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("privacy link navigates to the privacy placeholder page", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("link", { name: "Patakaran sa Privacy" }).click();

  await expect(page).toHaveURL("/privacy");
  await expect(page.getByRole("heading", { name: "Patakaran sa Privacy" })).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("home page renders the foundation shell in Filipino by default", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "fil");
  await expect(page.getByRole("heading", { name: "Maligayang pagdating sa BHW Connect" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Patakaran sa Privacy" })).toBeVisible();
});

test("language toggle switches the sample string to English", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "English" }).click();

  await expect(page.getByRole("heading", { name: "Welcome to BHW Connect" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("privacy link navigates to the privacy placeholder page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Patakaran sa Privacy" }).click();

  await expect(page).toHaveURL("/privacy");
  await expect(page.getByRole("heading", { name: "Patakaran sa Privacy" })).toBeVisible();
});

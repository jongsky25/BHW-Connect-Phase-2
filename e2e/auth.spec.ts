import { expect, test } from "@playwright/test";

// These specs cover what's testable without a provisioned Supabase project
// (this repo's own CI has none — see README "Getting started"). Once a
// project + seeded pilot accounts exist, e2e/auth.live.spec.ts exercises the
// full login -> forced password change -> consent -> home flow plus lockout.

test.describe("login page", () => {
  test("renders the login form in Filipino by default", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Mag-log in" })).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mag-log in" })).toBeVisible();
  });

  test("switches to English via the language toggle", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "English" }).click();

    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  });

  test("username and password are required fields", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByLabel("Username")).toHaveAttribute("required", "");
    await expect(page.getByLabel("Password")).toHaveAttribute("required", "");
    await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
  });

  test("shows the session-timeout banner when redirected with that reason", async ({ page }) => {
    await page.goto("/login?reason=timeout");

    await expect(page.getByText("Na-sign out ka pagkatapos ng 8 oras")).toBeVisible();
  });
});

test.describe("change-password page", () => {
  test("renders the forced password change form", async ({ page }) => {
    await page.goto("/change-password");

    await expect(page.getByRole("heading", { name: "Gumawa ng bagong password" })).toBeVisible();
    await expect(page.getByLabel("Bagong password", { exact: true })).toHaveAttribute("minlength", "8");
    await expect(page.getByLabel("Kumpirmahin ang bagong password")).toBeVisible();
  });
});

test.describe("consent page", () => {
  test("renders the DPA consent notice and agree action", async ({ page }) => {
    await page.goto("/consent");

    await expect(page.getByRole("heading", { name: "Bago ka magpatuloy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Basahin ang buong Patakaran sa Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    await expect(page.getByRole("button", { name: "Nauunawaan ko at sumasang-ayon ako" })).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";
import { STABLE_ADMIN } from "./fixtures/auth";

test("admin creates a BHW, resets their password, deactivates them, and every action shows up in the audit log", async ({
  page,
}) => {
  const username = `e2e.admin.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const fullName = `E2E Admin Console ${username}`;

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.getByRole("link", { name: "Admin console" }).click();
  await expect(page).toHaveURL("/admin/users");

  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Buong Pangalan").fill(fullName);
  await page.getByRole("button", { name: "Gumawa ng User" }).click();

  const banner = page.getByRole("status");
  await expect(banner).toContainText(username);
  await expect(banner).toContainText(/[0-9a-f]{10}/);

  const row = page.getByRole("row", { name: new RegExp(username) });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "I-reset ang password" }).click();
  await expect(banner).toContainText(username);
  await expect(banner).toContainText(/[0-9a-f]{10}/);

  await row.getByRole("button", { name: "I-deactivate" }).click();
  await expect(row.getByText("Deaktibo")).toBeVisible();
  await expect(row.getByRole("button", { name: "I-reactivate" })).toBeVisible();

  await page.goto("/admin/audit");
  await expect(page.locator("li", { hasText: username })).toHaveCount(3);
});

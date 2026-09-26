import { expect, test } from "@playwright/test";
import { STABLE_ADMIN, STABLE_BHW } from "./fixtures/auth";

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

test("the header app name stays on the public landing page for a signed-out visitor", async ({ page }) => {
  await page.goto("/privacy");

  await page.getByRole("link", { name: "BHW Connect" }).click();

  await expect(page).toHaveURL("/");
});

test("a signed-in BHW's header app name goes to /home, not the public landing page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/settings");
  await page.getByRole("link", { name: "BHW Connect" }).click();

  await expect(page).toHaveURL("/home");
});

test("signing out from the header's user menu on a non-home page lands on /login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/settings");
  await page.getByRole("button", { name: /^Naka-login bilang/ }).click();
  await page.getByRole("button", { name: "Mag-sign out" }).click();

  await expect(page).toHaveURL("/login", { timeout: 10_000 });
});

test("the header stays a single row at a 320px viewport, for a visitor and every role", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });

  await page.goto("/");
  const signedOutHeight = await page.locator("header").boundingBox().then((box) => box?.height);

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });
  const bhwHeight = await page.locator("header").boundingBox().then((box) => box?.height);

  // /home has its own inline sign-out action too, so go to a page without
  // one first to keep the header's "Mag-sign out" unambiguous.
  await page.goto("/settings");
  await page.getByRole("button", { name: /^Naka-login bilang/ }).click();
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });

  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });
  const adminHeight = await page.locator("header").boundingBox().then((box) => box?.height);

  // A wrapped header (hamburger+app name and bell+avatar on separate rows)
  // is roughly double this height; same value across roles rules that out.
  expect(signedOutHeight).toBe(bhwHeight);
  expect(bhwHeight).toBe(adminHeight);
  expect(bhwHeight).toBeLessThan(100);
});

test("breadcrumbs let a signed-in BHW navigate back up from a nested page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/kb");
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb).toBeVisible();

  await breadcrumb.getByRole("link", { name: "← Home" }).click();

  await expect(page).toHaveURL("/home");
});
